import type { Express } from "express";
import type { Server } from "http";
import { api } from "@shared/routes";
import { z } from "zod";

import { validateRequest } from "./lib/validate";
import {
  insertPromptTemplateSchema,
  updatePromptTemplateSchema,
  insertCategorySchema,
  updateCategorySchema,
} from "@shared/schema";
import { logger } from "./lib/logger";
import {
  requireAuth,
  requireAdmin,
  type AuthenticatedRequest,
} from "./lib/auth-middleware";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { createKieTask, getKieTaskStatus } from "./lib/kie-client";
import { downloadAndStoreImages, downloadAndStoreImagesWithWatermark } from "./lib/image-storage";
import { generateLimiter } from "./lib/rate-limiter";
import {
  checkGenerationLimits,
  recordGeneration,
} from "./lib/generation-limits";

/**
 * Extract image URLs from the Kie.ai resultJson, regardless of the exact structure.
 * Handles known shapes: { resultUrls: [...] }, { images: [...] }, { url: "..." },
 * or a plain array of URLs, or deeply nested structures.
 */
function extractImageUrls(parsed: unknown): string[] {
  if (!parsed) return [];

  // Direct array of strings
  if (Array.isArray(parsed)) {
    const urls = parsed.filter(
      (item) => typeof item === "string" && item.startsWith("http"),
    );
    if (urls.length > 0) return urls;
    // Array of objects with url field
    const fromObjects = parsed
      .filter((item) => typeof item === "object" && item !== null)
      .map(
        (item: any) => item.url || item.image_url || item.imageUrl || item.src,
      )
      .filter(
        (u: unknown) =>
          typeof u === "string" && (u as string).startsWith("http"),
      );
    if (fromObjects.length > 0) return fromObjects as string[];
  }

  if (typeof parsed === "object" && parsed !== null) {
    const obj = parsed as Record<string, unknown>;

    // Try common known keys
    for (const key of [
      "resultUrls",
      "result_urls",
      "images",
      "urls",
      "output",
      "data",
      "results",
    ]) {
      const value = obj[key];
      if (Array.isArray(value)) {
        const extracted = extractImageUrls(value);
        if (extracted.length > 0) return extracted;
      }
    }

    // Single URL field
    for (const key of [
      "url",
      "image_url",
      "imageUrl",
      "src",
      "image",
      "output",
    ]) {
      const value = obj[key];
      if (typeof value === "string" && value.startsWith("http")) {
        return [value];
      }
    }

    // Recurse into all values as a last resort
    for (const value of Object.values(obj)) {
      if (typeof value === "object" && value !== null) {
        const extracted = extractImageUrls(value);
        if (extracted.length > 0) return extracted;
      }
    }
  }

  // Single string
  if (typeof parsed === "string" && parsed.startsWith("http")) {
    return [parsed];
  }

  return [];
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // =============================================
  // HEALTH CHECK
  // =============================================
  app.get(api.health.path, (_req, res) => {
    res.json({ status: "ok" });
  });

  // =============================================
  // CATEGORY ENDPOINTS
  // =============================================

  // GET /api/categories
  app.get(api.categories.list.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const supabaseAdmin = getSupabaseAdmin();

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", authReq.userId)
        .single();

      let query = supabaseAdmin
        .from("categories")
        .select("*")
        .order("display_order", { ascending: true });

      if (profile?.role !== "admin") {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      logger.error({ err: error }, "Error listing categories");
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/categories (Admin only)
  app.post(
    api.categories.create.path,
    requireAuth,
    requireAdmin,
    validateRequest(insertCategorySchema),
    async (req, res) => {
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const { data, error } = await supabaseAdmin
          .from("categories")
          .insert(req.body)
          .select()
          .single();

        if (error) throw error;
        res.status(201).json(data);
      } catch (error: any) {
        logger.error({ err: error }, "Error creating category");
        res.status(500).json({ message: error.message });
      }
    },
  );

  // PATCH /api/categories/:id (Admin only)
  app.patch(
    api.categories.update.path,
    requireAuth,
    requireAdmin,
    validateRequest(updateCategorySchema),
    async (req, res) => {
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const { data, error } = await supabaseAdmin
          .from("categories")
          .update(req.body)
          .eq("id", req.params.id)
          .select()
          .single();

        if (error) throw error;
        res.json(data);
      } catch (error: any) {
        logger.error({ err: error }, "Error updating category");
        res.status(500).json({ message: error.message });
      }
    },
  );

  // DELETE /api/categories/:id (Admin only)
  app.delete(
    api.categories.delete.path,
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const supabaseAdmin = getSupabaseAdmin();

        // Check if any active template uses this category
        const { data: category } = await supabaseAdmin
          .from("categories")
          .select("slug")
          .eq("id", req.params.id)
          .single();

        if (category) {
          const { data: usedBy } = await supabaseAdmin
            .from("prompt_templates")
            .select("id")
            .eq("category", category.slug)
            .eq("is_active", true)
            .limit(1);

          if (usedBy && usedBy.length > 0) {
            return res.status(400).json({
              message:
                "Cette catégorie est utilisée par des templates actifs. Désactivez-les d'abord.",
            });
          }
        }

        const { error } = await supabaseAdmin
          .from("categories")
          .delete()
          .eq("id", req.params.id);

        if (error) throw error;
        res.json({ message: "Catégorie supprimée" });
      } catch (error: any) {
        logger.error({ err: error }, "Error deleting category");
        res.status(500).json({ message: error.message });
      }
    },
  );

  // =============================================
  // TEMPLATE ENDPOINTS
  // =============================================

  // GET /api/templates/marquee - Public endpoint for landing page marquee
  app.get(api.templates.marquee.path, async (_req, res) => {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin
        .from("prompt_templates")
        .select("name, example_before_url, example_after_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Keep templates that have at least the after image
      const filtered = (data ?? [])
        .filter((t) => t.example_after_url)
        .slice(0, 12);

      res.json(filtered);
    } catch (error: any) {
      logger.error({ err: error }, "Error fetching marquee templates");
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/templates - List templates (admin sees all, users see active only)
  app.get(api.templates.list.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const supabaseAdmin = getSupabaseAdmin();

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", authReq.userId)
        .single();

      let query = supabaseAdmin
        .from("prompt_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (profile?.role !== "admin") {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      logger.error({ err: error }, "Error listing templates");
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/templates/:id
  app.get(api.templates.get.path, requireAuth, async (req, res) => {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin
        .from("prompt_templates")
        .select("*")
        .eq("id", req.params.id)
        .single();

      if (error || !data) {
        return res.status(404).json({ message: "Template non trouvé" });
      }
      res.json(data);
    } catch (error: any) {
      logger.error({ err: error }, "Error fetching template");
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/templates (Admin only)
  app.post(
    api.templates.create.path,
    requireAuth,
    requireAdmin,
    validateRequest(insertPromptTemplateSchema),
    async (req, res) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const supabaseAdmin = getSupabaseAdmin();

        const { data, error } = await supabaseAdmin
          .from("prompt_templates")
          .insert({ ...req.body, created_by: authReq.userId })
          .select()
          .single();

        if (error) throw error;
        res.status(201).json(data);
      } catch (error: any) {
        logger.error({ err: error }, "Error creating template");
        res.status(500).json({ message: error.message });
      }
    },
  );

  // PATCH /api/templates/:id (Admin only)
  app.patch(
    api.templates.update.path,
    requireAuth,
    requireAdmin,
    validateRequest(updatePromptTemplateSchema),
    async (req, res) => {
      try {
        const supabaseAdmin = getSupabaseAdmin();

        const { data, error } = await supabaseAdmin
          .from("prompt_templates")
          .update({ ...req.body, updated_at: new Date().toISOString() })
          .eq("id", req.params.id)
          .select()
          .single();

        if (error) throw error;
        res.json(data);
      } catch (error: any) {
        logger.error({ err: error }, "Error updating template");
        res.status(500).json({ message: error.message });
      }
    },
  );

  // DELETE /api/templates/:id (Admin only)
  app.delete(
    api.templates.delete.path,
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const { error } = await supabaseAdmin
          .from("prompt_templates")
          .delete()
          .eq("id", req.params.id);

        if (error) throw error;
        res.json({ message: "Template supprimé" });
      } catch (error: any) {
        logger.error({ err: error }, "Error deleting template");
        res.status(500).json({ message: error.message });
      }
    },
  );

  // POST /api/templates/:id/upload-image (Admin only)
  const uploadImageSchema = z.object({
    field: z.enum(["example_before_url", "example_after_url"]),
    image: z.string().min(1),
  });

  app.post(
    api.templates.uploadImage.path,
    requireAuth,
    requireAdmin,
    validateRequest(uploadImageSchema),
    async (req, res) => {
      try {
        const { field, image } = req.body;
        const templateId = req.params.id;

        const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!match) {
          return res.status(400).json({ message: "Format d'image invalide" });
        }

        const contentType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, "base64");
        const ext = contentType.split("/")[1] || "jpg";
        const key = `templates/${templateId}/${field}.${ext}`;

        const { uploadToR2 } = await import("./lib/r2-client");
        const publicUrl = await uploadToR2(key, buffer, contentType);

        const supabaseAdmin = getSupabaseAdmin();
        const { data, error } = await supabaseAdmin
          .from("prompt_templates")
          .update({ [field]: publicUrl, updated_at: new Date().toISOString() })
          .eq("id", templateId)
          .select()
          .single();

        if (error) throw error;
        res.json(data);
      } catch (error: any) {
        logger.error({ err: error }, "Error uploading template image");
        res.status(500).json({ message: error.message });
      }
    },
  );

  // =============================================
  // PRANK GENERATION ENDPOINTS
  // =============================================

  const generatePrankBodySchema = z.object({
    template_id: z.string().uuid(),
    placeholders: z.record(z.string()).optional(),
    aspect_ratio: z.string().optional().default("1:1"),
  });

  // POST /api/pranks/generate
  app.post(
    api.pranks.generate.path,
    requireAuth,
    generateLimiter,
    validateRequest(generatePrankBodySchema),
    async (req, res) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const { template_id, placeholders, aspect_ratio } = req.body;
        const supabaseAdmin = getSupabaseAdmin();

        // 0. Check generation limits (account)
        const limitResult = await checkGenerationLimits(authReq.userId);
        if (!limitResult.allowed) {
          return res.status(403).json({ message: limitResult.reason });
        }
        const isFreeGeneration = !limitResult.isSubscriber && limitResult.generationCount === 0;

        // 1. Check credits (skip for first free generation)
        const { data: userProfile, error: profileErr } = await supabaseAdmin
          .from("profiles")
          .select("credits")
          .eq("id", authReq.userId)
          .single();

        if (profileErr || !userProfile) {
          return res.status(403).json({ message: "Profil introuvable" });
        }

        if (!isFreeGeneration && userProfile.credits < 5) {
          return res.status(403).json({
            message:
              "Crédits insuffisants. Il vous faut au moins 5 jetons pour générer un prank.",
          });
        }

        // 2. Fetch template
        const { data: template, error: tplErr } = await supabaseAdmin
          .from("prompt_templates")
          .select("*")
          .eq("id", template_id)
          .eq("is_active", true)
          .single();

        if (tplErr || !template) {
          return res
            .status(404)
            .json({ message: "Template non trouvé ou inactif" });
        }

        // 2. Build final prompt by replacing placeholders
        let finalPrompt: string = template.prompt_text;
        if (placeholders) {
          for (const [key, value] of Object.entries(
            placeholders as Record<string, string>,
          )) {
            finalPrompt = finalPrompt.replace(
              new RegExp(`\\{\\{${key}\\}\\}`, "g"),
              value,
            );
          }
        }

        // 3. Call Kie.ai
        const kieResponse = await createKieTask({
          prompt: finalPrompt,
          aspect_ratio: aspect_ratio || "1:1",
        });

        if (kieResponse.code !== 200 || !kieResponse.data?.taskId) {
          logger.error(
            { response: kieResponse },
            "Kie.ai createTask unexpected response",
          );
          return res.status(502).json({
            message: "Erreur lors de la création de la tâche de génération",
          });
        }

        // 4. Deduct 5 credits atomically (skip for first free generation)
        if (!isFreeGeneration) {
          const { error: deductErr } = await supabaseAdmin.rpc("deduct_credits", {
            p_user_id: authReq.userId,
            p_amount: 5,
          });

          if (deductErr) {
            logger.error({ err: deductErr }, "Failed to deduct credits");
            return res
              .status(500)
              .json({ message: "Erreur lors de la déduction des crédits" });
          }
        }

        // 5. Store in generated_pranks
        const { data: prank, error: insertErr } = await supabaseAdmin
          .from("generated_pranks")
          .insert({
            user_id: authReq.userId,
            template_id,
            final_prompt: finalPrompt,
            kie_task_id: kieResponse.data.taskId,
            status: "waiting",
            aspect_ratio,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        // Record generation for limit tracking
        await recordGeneration(authReq.userId);

        res.status(201).json({
          id: prank.id,
          taskId: kieResponse.data.taskId,
          status: "waiting",
          isSubscriber: limitResult.isSubscriber,
        });
      } catch (error: any) {
        logger.error({ err: error }, "Error generating prank");
        res.status(500).json({ message: error.message });
      }
    },
  );

  // POST /api/pranks/generate-direct (free prompt, no template)
  const generateDirectBodySchema = z.object({
    prompt: z.string().min(1).max(2000),
    aspect_ratio: z.string().optional().default("9:16"),
    images: z.array(z.string()).optional().default([]),
    template_id: z.string().uuid().optional(),
  });

  app.post(
    api.pranks.generateDirect.path,
    requireAuth,
    generateLimiter,
    validateRequest(generateDirectBodySchema),
    async (req, res) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const { prompt, aspect_ratio, images, template_id } = req.body;
        const supabaseAdmin = getSupabaseAdmin();

        // 0. Check generation limits (account)
        const limitResult = await checkGenerationLimits(authReq.userId);
        if (!limitResult.allowed) {
          return res.status(403).json({ message: limitResult.reason });
        }
        const isFreeGeneration = !limitResult.isSubscriber && limitResult.generationCount === 0;

        // 1. Check credits (skip for first free generation)
        const { data: userProfile, error: profileErr } = await supabaseAdmin
          .from("profiles")
          .select("credits")
          .eq("id", authReq.userId)
          .single();

        if (profileErr || !userProfile) {
          return res.status(403).json({ message: "Profil introuvable" });
        }

        if (!isFreeGeneration && userProfile.credits < 5) {
          return res.status(403).json({
            message:
              "Crédits insuffisants. Il vous faut au moins 5 jetons pour générer un prank.",
          });
        }

        // 2. Upload images to R2 and get public URLs
        let imageUrls: string[] = [];
        if (images && images.length > 0) {
          const { uploadToR2 } = await import("./lib/r2-client");
          for (let i = 0; i < images.length; i++) {
            const dataUrl = images[i];
            const match = dataUrl.match(
              /^data:(image\/[\w+.-]+);base64,(.+)$/s,
            );
            if (!match) {
              logger.warn(
                { index: i, prefix: dataUrl.substring(0, 40) },
                "Invalid base64 image, skipping",
              );
              continue;
            }
            const contentType = match[1];
            const base64Data = match[2];
            const buffer = Buffer.from(base64Data, "base64");
            const ext = contentType.split("/")[1] || "jpg";
            const key = `inputs/${authReq.userId}/${Date.now()}-${i}.${ext}`;
            const publicUrl = await uploadToR2(key, buffer, contentType);
            imageUrls.push(publicUrl);
          }
        }

        // 3. Call Kie.ai
        logger.info(
          { imageCount: imageUrls.length, imageUrls },
          "Calling Kie.ai with images",
        );
        const kieResponse = await createKieTask({
          prompt,
          aspect_ratio: aspect_ratio || "9:16",
          ...(imageUrls.length > 0 ? { image_input: imageUrls } : {}),
        });

        if (kieResponse.code !== 200 || !kieResponse.data?.taskId) {
          logger.error(
            { response: kieResponse },
            "Kie.ai createTask unexpected response",
          );
          return res.status(502).json({
            message: "Erreur lors de la création de la tâche de génération",
          });
        }

        // 4. Deduct 5 credits (skip for first free generation)
        if (!isFreeGeneration) {
          const { error: deductErr } = await supabaseAdmin.rpc("deduct_credits", {
            p_user_id: authReq.userId,
            p_amount: 5,
          });

          if (deductErr) {
            logger.error({ err: deductErr }, "Failed to deduct credits");
            return res
              .status(500)
              .json({ message: "Erreur lors de la déduction des crédits" });
          }
        }

        // 5. Store in generated_pranks
        const { data: prank, error: insertErr } = await supabaseAdmin
          .from("generated_pranks")
          .insert({
            user_id: authReq.userId,
            template_id: template_id || null,
            final_prompt: prompt,
            kie_task_id: kieResponse.data.taskId,
            status: "waiting",
            aspect_ratio,
            input_urls: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        // Record generation for limit tracking
        await recordGeneration(authReq.userId);

        res.status(201).json({
          id: prank.id,
          taskId: kieResponse.data.taskId,
          status: "waiting",
          isSubscriber: limitResult.isSubscriber,
        });
      } catch (error: any) {
        logger.error({ err: error }, "Error generating direct prank");
        res.status(500).json({ message: error.message });
      }
    },
  );

  // GET /api/pranks/can-generate
  app.get(api.pranks.canGenerate.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await checkGenerationLimits(authReq.userId);
      res.json({
        canGenerate: result.allowed,
        isSubscriber: result.isSubscriber,
        generationCount: result.generationCount,
        freeLimit: 1,
        reason: result.reason,
      });
    } catch (error: any) {
      logger.error({ err: error }, "Error checking generation eligibility");
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/pranks/:taskId/status
  app.get(api.pranks.status.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { taskId } = req.params;
      const supabaseAdmin = getSupabaseAdmin();

      // Verify this task belongs to the user
      const { data: prank, error: fetchErr } = await supabaseAdmin
        .from("generated_pranks")
        .select("*")
        .eq("kie_task_id", taskId)
        .eq("user_id", authReq.userId)
        .single();

      if (fetchErr || !prank) {
        return res.status(404).json({ message: "Tâche non trouvée" });
      }

      // If already terminal, return cached result
      if (prank.status === "success" || prank.status === "fail") {
        // Check subscriber status for watermark decision
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("is_subscriber, role")
          .eq("id", authReq.userId)
          .single();
        const isSubscriber = profile?.is_subscriber || profile?.role === "admin";

        const originals = prank.result_urls ? JSON.parse(prank.result_urls) : [];
        const watermarkedList = prank.watermarked_urls ? JSON.parse(prank.watermarked_urls) : originals;

        return res.json({
          prankId: prank.id,
          status: prank.status,
          resultUrls: isSubscriber ? originals : watermarkedList,
          failMessage: prank.fail_message,
          costTime: prank.cost_time,
          isSubscriber,
          requiresPaywall: !isSubscriber,
        });
      }

      // Poll Kie.ai
      const kieStatus = await getKieTaskStatus(taskId);

      if (
        kieStatus.data.state === "success" ||
        kieStatus.data.state === "fail"
      ) {
        let resultUrls: string[] = [];
        let watermarkedUrls: string[] = [];
        if (kieStatus.data.state === "success" && kieStatus.data.resultJson) {
          try {
            const parsed = JSON.parse(kieStatus.data.resultJson);
            logger.info(
              { resultJson: parsed, rawResultJson: kieStatus.data.resultJson },
              "Kie.ai resultJson parsed",
            );
            resultUrls = extractImageUrls(parsed);
          } catch (parseErr) {
            logger.error(
              { err: parseErr, rawResultJson: kieStatus.data.resultJson },
              "Failed to parse Kie.ai resultJson",
            );
          }

          // Re-upload images to R2 with watermarked versions
          if (resultUrls.length > 0) {
            try {
              const stored = await downloadAndStoreImagesWithWatermark(prank.id, resultUrls);
              resultUrls = stored.originals;
              watermarkedUrls = stored.watermarked;
            } catch (err) {
              logger.error(
                { err, prankId: prank.id },
                "Failed to re-upload images to R2, keeping original URLs",
              );
            }
          }
        }

        // Check subscriber status
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("is_subscriber, role")
          .eq("id", authReq.userId)
          .single();
        const isSubscriber = profile?.is_subscriber || profile?.role === "admin";

        // Update record
        await supabaseAdmin
          .from("generated_pranks")
          .update({
            status: kieStatus.data.state,
            result_urls: JSON.stringify(resultUrls),
            watermarked_urls: watermarkedUrls.length > 0 ? JSON.stringify(watermarkedUrls) : null,
            fail_message: kieStatus.data.failMsg || null,
            cost_time: kieStatus.data.costTime
              ? String(kieStatus.data.costTime)
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", prank.id);

        return res.json({
          prankId: prank.id,
          status: kieStatus.data.state,
          resultUrls: isSubscriber ? resultUrls : (watermarkedUrls.length > 0 ? watermarkedUrls : resultUrls),
          failMessage: kieStatus.data.failMsg,
          costTime: kieStatus.data.costTime,
          isSubscriber,
          requiresPaywall: !isSubscriber,
        });
      }

      // Still waiting
      res.json({
        prankId: prank.id,
        status: "waiting",
        resultUrls: [],
        failMessage: null,
        costTime: null,
        isSubscriber: false,
        requiresPaywall: false,
      });
    } catch (error: any) {
      logger.error({ err: error }, "Error checking prank status");
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/pranks/history
  app.get(api.pranks.history.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const supabaseAdmin = getSupabaseAdmin();

      // Non-subscribers have no history access
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_subscriber, role")
        .eq("id", authReq.userId)
        .single();
      const isSubscriber = profile?.is_subscriber || profile?.role === "admin";
      if (!isSubscriber) {
        return res.json([]);
      }

      const { data, error } = await supabaseAdmin
        .from("generated_pranks")
        .select("*, prompt_templates(name, category)")
        .eq("user_id", authReq.userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      logger.error({ err: error }, "Error fetching prank history");
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/pranks/:prankId/download/:imageIndex
  app.get(api.pranks.download.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { prankId, imageIndex } = req.params;
      const index = parseInt(imageIndex, 10);
      const supabaseAdmin = getSupabaseAdmin();

      if (isNaN(index) || index < 0) {
        return res.status(400).json({ message: "Index d'image invalide" });
      }

      const { data: prank, error } = await supabaseAdmin
        .from("generated_pranks")
        .select("result_urls, watermarked_urls")
        .eq("id", prankId)
        .eq("user_id", authReq.userId)
        .single();

      if (error || !prank || !prank.result_urls) {
        return res.status(404).json({ message: "Prank non trouvé" });
      }

      // Check subscriber status — non-subscribers get watermarked version
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_subscriber, role")
        .eq("id", authReq.userId)
        .single();
      const isSubscriber = profile?.is_subscriber || profile?.role === "admin";

      const urlsSource = isSubscriber
        ? prank.result_urls
        : (prank.watermarked_urls || prank.result_urls);

      let urls: string[];
      try {
        urls = JSON.parse(urlsSource);
      } catch {
        return res.status(500).json({ message: "URLs invalides" });
      }

      if (index >= urls.length) {
        return res.status(404).json({ message: "Image non trouvée" });
      }

      const imageUrl = urls[index];
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return res
          .status(502)
          .json({ message: "Impossible de récupérer l'image" });
      }

      const contentType =
        imageResponse.headers.get("content-type") || "image/jpeg";
      const extension = contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
          ? "webp"
          : "jpg";

      const randomSuffix = Math.random().toString(36).substring(2, 8);

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="prank-${randomSuffix}.${extension}"`,
      );
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

      const arrayBuffer = await imageResponse.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      logger.error({ err: error }, "Error downloading prank image");
      res.status(500).json({ message: error.message });
    }
  });

  // DELETE /api/pranks/:prankId
  app.delete(api.pranks.delete.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { prankId } = req.params;
      const supabaseAdmin = getSupabaseAdmin();

      const { error } = await supabaseAdmin
        .from("generated_pranks")
        .delete()
        .eq("id", prankId)
        .eq("user_id", authReq.userId);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "Error deleting prank");
      res.status(500).json({ message: error.message });
    }
  });

  // =============================================
  // ADMIN: CREDITS MANAGEMENT
  // =============================================

  const addCreditsBodySchema = z.object({
    user_id: z.string().uuid(),
    amount: z.number().int().min(1),
  });

  app.post(
    api.admin.credits.path,
    requireAuth,
    requireAdmin,
    validateRequest(addCreditsBodySchema),
    async (req, res) => {
      try {
        const { user_id, amount } = req.body;
        const supabaseAdmin = getSupabaseAdmin();

        const { data, error } = await supabaseAdmin.rpc("add_credits", {
          p_user_id: user_id,
          p_amount: amount,
        });

        if (error) throw error;

        res.json({ message: `${amount} jetons ajoutés`, credits: data });
      } catch (error: any) {
        logger.error({ err: error }, "Error adding credits");
        res.status(500).json({ message: error.message });
      }
    },
  );

  // PATCH /api/admin/users/:id (Admin only) — update any user profile
  const updateUserBodySchema = z.object({
    is_subscriber: z.boolean().optional(),
    role: z.enum(["user", "admin"]).optional(),
    credits: z.number().int().min(0).optional(),
  });

  app.patch(
    api.admin.updateUser.path,
    requireAuth,
    requireAdmin,
    validateRequest(updateUserBodySchema),
    async (req, res) => {
      try {
        const { id } = req.params;
        const supabaseAdmin = getSupabaseAdmin();
        const { data, error } = await supabaseAdmin
          .from("profiles")
          .update(req.body)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        res.json(data);
      } catch (error: any) {
        logger.error({ err: error }, "Error updating user profile");
        res.status(500).json({ message: error.message });
      }
    },
  );

  // =============================================
  // FAVORITES ENDPOINTS
  // =============================================

  // GET /api/favorites - List user's favorite template IDs
  app.get(api.favorites.list.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const supabaseAdmin = getSupabaseAdmin();

      const { data, error } = await supabaseAdmin
        .from("favorite_templates")
        .select("template_id")
        .eq("user_id", authReq.userId);

      if (error) throw error;
      res.json(data.map((f: { template_id: string }) => f.template_id));
    } catch (error: any) {
      logger.error({ err: error }, "Error listing favorites");
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/favorites/:templateId - Add a favorite
  app.post(api.favorites.add.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const supabaseAdmin = getSupabaseAdmin();

      const { error } = await supabaseAdmin
        .from("favorite_templates")
        .upsert(
          { user_id: authReq.userId, template_id: req.params.templateId },
          { onConflict: "user_id,template_id" },
        );

      if (error) throw error;
      res.json({ message: "Favori ajouté" });
    } catch (error: any) {
      logger.error({ err: error }, "Error adding favorite");
      res.status(500).json({ message: error.message });
    }
  });

  // DELETE /api/favorites/:templateId - Remove a favorite
  app.delete(api.favorites.remove.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const supabaseAdmin = getSupabaseAdmin();

      const { error } = await supabaseAdmin
        .from("favorite_templates")
        .delete()
        .eq("user_id", authReq.userId)
        .eq("template_id", req.params.templateId);

      if (error) throw error;
      res.json({ message: "Favori retiré" });
    } catch (error: any) {
      logger.error({ err: error }, "Error removing favorite");
      res.status(500).json({ message: error.message });
    }
  });

  // =============================================
  // STRIPE BILLING
  // =============================================

  // POST /api/stripe/create-checkout — Initiate subscription checkout
  app.post(api.stripe.createCheckout.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { getStripe, getStripePriceId } = await import("./lib/stripe");
      const stripe = getStripe();
      const priceId = getStripePriceId();
      const supabaseAdmin = getSupabaseAdmin();

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("stripe_customer_id, email, is_subscriber")
        .eq("id", authReq.userId)
        .single();

      if (profile?.is_subscriber) {
        return res
          .status(400)
          .json({ message: "Tu as déjà un abonnement actif." });
      }

      const sessionParams: Record<string, any> = {
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${req.headers.origin || process.env.APP_URL || "http://localhost:5000"}/generate?checkout=success`,
        cancel_url: `${req.headers.origin || process.env.APP_URL || "http://localhost:5000"}/generate?checkout=cancel`,
        metadata: {
          user_id: authReq.userId,
          price_id: priceId,
        },
        subscription_data: {
          metadata: {
            user_id: authReq.userId,
          },
        },
      };

      if (profile?.stripe_customer_id) {
        sessionParams.customer = profile.stripe_customer_id;
      } else {
        sessionParams.customer_email = profile?.email || undefined;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      res.json({ url: session.url });
    } catch (error: any) {
      logger.error({ err: error }, "Error creating checkout session");
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/stripe/create-portal — Manage subscription via Stripe Customer Portal
  app.post(api.stripe.createPortal.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { getStripe } = await import("./lib/stripe");
      const stripe = getStripe();
      const supabaseAdmin = getSupabaseAdmin();

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", authReq.userId)
        .single();

      if (!profile?.stripe_customer_id) {
        return res
          .status(400)
          .json({ message: "Aucun abonnement Stripe trouvé." });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${req.headers.origin || process.env.APP_URL || "http://localhost:5000"}/settings`,
      });

      res.json({ url: portalSession.url });
    } catch (error: any) {
      logger.error({ err: error }, "Error creating portal session");
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/stripe/verify-session — Fallback: verify subscription directly with Stripe
  // Called by client on checkout return, in case webhook didn't fire
  app.post(api.stripe.verifySession.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { getStripe } = await import("./lib/stripe");
      const stripe = getStripe();
      const supabaseAdmin = getSupabaseAdmin();

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("stripe_customer_id, is_subscriber")
        .eq("id", authReq.userId)
        .single();

      // Already a subscriber — nothing to do
      if (profile?.is_subscriber) {
        return res.json({ status: "active", already: true });
      }

      // Find the customer by email if no stripe_customer_id yet
      let customerId = profile?.stripe_customer_id;
      if (!customerId) {
        const { data: authProfile } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("id", authReq.userId)
          .single();

        if (authProfile?.email) {
          const customers = await stripe.customers.list({
            email: authProfile.email,
            limit: 1,
          });
          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
          }
        }
      }

      if (!customerId) {
        return res.json({ status: "no_customer" });
      }

      // Check for active subscriptions on this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        return res.json({ status: "no_active_subscription" });
      }

      const subscription = subscriptions.data[0];

      // Activate: update profile
      await supabaseAdmin
        .from("profiles")
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          subscription_status: "active",
          is_subscriber: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authReq.userId);

      // Add credits
      await supabaseAdmin.rpc("add_credits", {
        p_user_id: authReq.userId,
        p_amount: 50,
      });

      // Upsert subscription record
      await supabaseAdmin
        .from("subscriptions")
        .upsert(
          {
            user_id: authReq.userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            status: "active",
            price_id: (subscription.items.data[0]?.price as any)?.id || "",
          },
          { onConflict: "stripe_subscription_id" },
        );

      logger.info(
        { userId: authReq.userId, subscriptionId: subscription.id },
        "Subscription activated via verify-session fallback",
      );

      res.json({ status: "activated" });
    } catch (error: any) {
      logger.error({ err: error }, "Error verifying session");
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/stripe/webhook — Stripe webhook (NO auth, raw body)
  app.post(api.stripe.webhook.path, async (req, res) => {
    try {
      const { getStripe, getStripeWebhookSecret } = await import(
        "./lib/stripe"
      );
      const {
        handleCheckoutCompleted,
        handleInvoicePaid,
        handleSubscriptionDeleted,
        handleSubscriptionUpdated,
      } = await import("./lib/stripe-webhooks");

      const stripe = getStripe();
      const sig = req.headers["stripe-signature"];

      if (!sig) {
        return res
          .status(400)
          .json({ message: "Missing stripe-signature header" });
      }

      let event;
      try {
        event = await stripe.webhooks.constructEventAsync(
          req.body,
          sig,
          getStripeWebhookSecret(),
        );
      } catch (err: any) {
        logger.warn({ err }, "Webhook signature verification failed");
        return res
          .status(400)
          .json({ message: `Webhook Error: ${err.message}` });
      }

      logger.info({ type: event.type, id: event.id }, "Stripe webhook received");

      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutCompleted(
            event.data.object as any,
          );
          break;
        case "invoice.paid":
          await handleInvoicePaid(event.data.object as any);
          break;
        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(
            event.data.object as any,
          );
          break;
        case "customer.subscription.updated":
          await handleSubscriptionUpdated(
            event.data.object as any,
          );
          break;
        default:
          logger.info({ type: event.type }, "Unhandled webhook event type");
      }

      res.json({ received: true });
    } catch (error: any) {
      logger.error({ err: error }, "Error processing webhook");
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
