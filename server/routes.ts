import type { Express } from "express";
import type { Server } from "http";
import { api } from "@shared/routes";
import { z } from "zod";

import { validateRequest } from "./lib/validate";
import { insertPromptTemplateSchema, updatePromptTemplateSchema } from "@shared/schema";
import { logger } from "./lib/logger";
import { requireAuth, requireAdmin, type AuthenticatedRequest } from "./lib/auth-middleware";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { createKieTask, getKieTaskStatus } from "./lib/kie-client";
import { downloadAndStoreImages } from "./lib/image-storage";

/**
 * Extract image URLs from the Kie.ai resultJson, regardless of the exact structure.
 * Handles known shapes: { resultUrls: [...] }, { images: [...] }, { url: "..." },
 * or a plain array of URLs, or deeply nested structures.
 */
function extractImageUrls(parsed: unknown): string[] {
  if (!parsed) return [];

  // Direct array of strings
  if (Array.isArray(parsed)) {
    const urls = parsed.filter((item) => typeof item === "string" && item.startsWith("http"));
    if (urls.length > 0) return urls;
    // Array of objects with url field
    const fromObjects = parsed
      .filter((item) => typeof item === "object" && item !== null)
      .map((item: any) => item.url || item.image_url || item.imageUrl || item.src)
      .filter((u: unknown) => typeof u === "string" && (u as string).startsWith("http"));
    if (fromObjects.length > 0) return fromObjects as string[];
  }

  if (typeof parsed === "object" && parsed !== null) {
    const obj = parsed as Record<string, unknown>;

    // Try common known keys
    for (const key of ["resultUrls", "result_urls", "images", "urls", "output", "data", "results"]) {
      const value = obj[key];
      if (Array.isArray(value)) {
        const extracted = extractImageUrls(value);
        if (extracted.length > 0) return extracted;
      }
    }

    // Single URL field
    for (const key of ["url", "image_url", "imageUrl", "src", "image", "output"]) {
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
  app: Express
): Promise<Server> {

  // =============================================
  // HEALTH CHECK
  // =============================================
  app.get(api.health.path, (_req, res) => {
    res.json({ status: "ok" });
  });

  // =============================================
  // TEMPLATE ENDPOINTS
  // =============================================

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
    }
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
    }
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
    }
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
    validateRequest(generatePrankBodySchema),
    async (req, res) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const { template_id, placeholders, aspect_ratio } = req.body;
        const supabaseAdmin = getSupabaseAdmin();

        // 1. Fetch template
        const { data: template, error: tplErr } = await supabaseAdmin
          .from("prompt_templates")
          .select("*")
          .eq("id", template_id)
          .eq("is_active", true)
          .single();

        if (tplErr || !template) {
          return res.status(404).json({ message: "Template non trouvé ou inactif" });
        }

        // 2. Build final prompt by replacing placeholders
        let finalPrompt: string = template.prompt_text;
        if (placeholders) {
          for (const [key, value] of Object.entries(placeholders as Record<string, string>)) {
            finalPrompt = finalPrompt.replace(
              new RegExp(`\\{\\{${key}\\}\\}`, "g"),
              value
            );
          }
        }

        // 3. Call Kie.ai
        const kieResponse = await createKieTask({
          prompt: finalPrompt,
          aspect_ratio: aspect_ratio || "1:1",
        });

        if (kieResponse.code !== 200 || !kieResponse.data?.taskId) {
          logger.error({ response: kieResponse }, "Kie.ai createTask unexpected response");
          return res.status(502).json({ message: "Erreur lors de la création de la tâche de génération" });
        }

        // 4. Store in generated_pranks
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

        res.status(201).json({
          id: prank.id,
          taskId: kieResponse.data.taskId,
          status: "waiting",
        });
      } catch (error: any) {
        logger.error({ err: error }, "Error generating prank");
        res.status(500).json({ message: error.message });
      }
    }
  );

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
        return res.json({
          status: prank.status,
          resultUrls: prank.result_urls ? JSON.parse(prank.result_urls) : [],
          failMessage: prank.fail_message,
          costTime: prank.cost_time,
        });
      }

      // Poll Kie.ai
      const kieStatus = await getKieTaskStatus(taskId);

      if (kieStatus.data.state === "success" || kieStatus.data.state === "fail") {
        let resultUrls: string[] = [];
        if (kieStatus.data.state === "success" && kieStatus.data.resultJson) {
          try {
            const parsed = JSON.parse(kieStatus.data.resultJson);
            logger.info({ resultJson: parsed, rawResultJson: kieStatus.data.resultJson }, "Kie.ai resultJson parsed");
            resultUrls = extractImageUrls(parsed);
          } catch (parseErr) {
            logger.error({ err: parseErr, rawResultJson: kieStatus.data.resultJson }, "Failed to parse Kie.ai resultJson");
          }

          // Re-upload images to R2 for permanent storage
          if (resultUrls.length > 0) {
            try {
              resultUrls = await downloadAndStoreImages(prank.id, resultUrls);
            } catch (err) {
              logger.error({ err, prankId: prank.id }, "Failed to re-upload images to R2, keeping original URLs");
            }
          }
        }

        // Update record
        await supabaseAdmin
          .from("generated_pranks")
          .update({
            status: kieStatus.data.state,
            result_urls: JSON.stringify(resultUrls),
            fail_message: kieStatus.data.failMsg || null,
            cost_time: kieStatus.data.costTime ? String(kieStatus.data.costTime) : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", prank.id);

        return res.json({
          status: kieStatus.data.state,
          resultUrls,
          failMessage: kieStatus.data.failMsg,
          costTime: kieStatus.data.costTime,
        });
      }

      // Still waiting
      res.json({ status: "waiting", resultUrls: [], failMessage: null, costTime: null });
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
        .select("result_urls")
        .eq("id", prankId)
        .eq("user_id", authReq.userId)
        .single();

      if (error || !prank || !prank.result_urls) {
        return res.status(404).json({ message: "Prank non trouvé" });
      }

      let urls: string[];
      try {
        urls = JSON.parse(prank.result_urls);
      } catch {
        return res.status(500).json({ message: "URLs invalides" });
      }

      if (index >= urls.length) {
        return res.status(404).json({ message: "Image non trouvée" });
      }

      const imageUrl = urls[index];
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return res.status(502).json({ message: "Impossible de récupérer l'image" });
      }

      const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
      const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="prank-${index + 1}.${extension}"`);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

      const arrayBuffer = await imageResponse.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      logger.error({ err: error }, "Error downloading prank image");
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
