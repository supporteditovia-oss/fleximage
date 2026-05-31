import type { Express } from "express";
import type { Server } from "http";
import { api } from "@shared/routes";
import { z } from "zod";
import { SUPPORTED_LOCALES } from "@shared/locales";

import { validateRequest } from "./lib/validate";
import {
  insertPromptTemplateSchema,
  updatePromptTemplateSchema,
  insertCategorySchema,
  updateCategorySchema,
  generateVideoBodySchema,
} from "@shared/schema";
import { logger } from "./lib/logger";
import {
  requireAuth,
  requireAdmin,
  type AuthenticatedRequest,
} from "./lib/auth-middleware";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { createKieTask, getKieTaskStatus } from "./lib/kie-client";
import {
  createRunwayVideoTask,
  getRunwayVideoStatus,
  RunwayApiError,
} from "./lib/kie-runway-client";
import {
  createOneshotJob,
  getOneshotJobStatus,
  getOneshotApiConfig,
  getAppSettings,
  uploadToOneshotApi,
  invalidateSettingsCache,
  isGoogleAiPromptFlagged,
} from "./lib/oneshot-api-client";
import { downloadAndStoreImages } from "./lib/image-storage";
import { uploadToR2 } from "./lib/r2-client";
import { generateLimiter } from "./lib/rate-limiter";
import {
  checkGenerationLimits,
  recordGeneration,
} from "./lib/generation-limits";
import {
  resolveLocaleFromProfile,
  resolveLocaleFromRequest,
  tBackend,
} from "./lib/i18n";
import { registerStripeRoutes } from "./stripe-routes";

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

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function parseJsonArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function normalizeKeywords(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof raw !== "string") return [];

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringifyAssetList(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.length > 0 ? JSON.stringify(value) : null;
  }
  return null;
}

function toLegacyStatus(
  status: string | null | undefined,
): "waiting" | "success" | "fail" {
  if (status === "succeeded" || status === "success") return "success";
  if (status === "failed" || status === "fail") return "fail";
  return "waiting";
}

function toDbStatus(
  status: "waiting" | "success" | "fail",
): "processing" | "succeeded" | "failed" {
  if (status === "success") return "succeeded";
  if (status === "fail") return "failed";
  return "processing";
}

function toTemplateDto(row: any) {
  const inputSchema = row.input_schema || {};
  const categorySlug =
    row.template_categories?.slug ||
    row.category_slug ||
    row.category ||
    null;

  return {
    ...row,
    category: categorySlug,
    image_slots:
      inputSchema.image_slots && inputSchema.image_slots.length
        ? JSON.stringify(inputSchema.image_slots)
        : null,
    text_fields:
      inputSchema.text_fields && inputSchema.text_fields.length
        ? JSON.stringify(inputSchema.text_fields)
        : null,
    keywords: Array.isArray(row.keywords) ? row.keywords.join(", ") : null,
  };
}

function toLegacyPrankDto(row: any) {
  const template = row.templates;
  const category =
    template?.template_categories?.slug ||
    template?.category_slug ||
    template?.category ||
    null;

  return {
    id: row.id,
    user_id: row.user_id,
    template_id: row.template_id,
    final_prompt: row.final_prompt,
    kie_task_id: row.provider_task_id,
    status: toLegacyStatus(row.status),
    result_urls: stringifyAssetList(row.output_assets),
    watermarked_urls: stringifyAssetList(row.watermarked_assets),
    input_urls: stringifyAssetList(row.input_assets),
    fail_message: row.fail_message,
    cost_time: row.cost_time,
    aspect_ratio: row.aspect_ratio,
    created_at: row.created_at,
    updated_at: row.updated_at,
    prompt_templates: template
      ? {
          name: template.name,
          category,
        }
      : null,
  };
}

async function resolveCategoryId(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  categorySlug: string | null | undefined,
): Promise<string | null> {
  if (!categorySlug) return null;

  const { data, error } = await supabaseAdmin
    .from("template_categories")
    .select("id")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

async function getUniqueTemplateSlug(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  name: string,
): Promise<string> {
  const baseSlug = slugify(name) || "template";
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("templates")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function buildTemplateInputSchema(body: any, current: any = {}) {
  const next = { ...(current && typeof current === "object" ? current : {}) };

  if (Object.prototype.hasOwnProperty.call(body, "image_slots")) {
    next.image_slots = parseJsonArray(body.image_slots);
  }

  if (Object.prototype.hasOwnProperty.call(body, "text_fields")) {
    next.text_fields = parseJsonArray(body.text_fields);
  }

  return next;
}

async function buildTemplatePayload(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  body: any,
  currentInputSchema?: any,
) {
  const payload: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(body, "name")) payload.name = body.name;
  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    payload.description = body.description || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "prompt_text")) {
    payload.prompt_text = body.prompt_text;
  }
  if (Object.prototype.hasOwnProperty.call(body, "is_active")) {
    payload.is_active = body.is_active;
  }
  if (Object.prototype.hasOwnProperty.call(body, "generation_type")) {
    payload.generation_type = body.generation_type;
  }
  if (Object.prototype.hasOwnProperty.call(body, "example_before_url")) {
    payload.example_before_url = body.example_before_url || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "example_after_url")) {
    payload.example_after_url = body.example_after_url || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "keywords")) {
    payload.keywords = normalizeKeywords(body.keywords);
  }
  if (Object.prototype.hasOwnProperty.call(body, "icon")) {
    payload.icon = body.icon || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "category")) {
    payload.category_id = await resolveCategoryId(supabaseAdmin, body.category);
  }
  if (
    Object.prototype.hasOwnProperty.call(body, "image_slots") ||
    Object.prototype.hasOwnProperty.call(body, "text_fields")
  ) {
    payload.input_schema = buildTemplateInputSchema(body, currentInputSchema);
  }

  return payload;
}

async function applyCreditDelta(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  params: {
    userId: string;
    delta: number;
    reason:
      | "subscription_grant"
      | "generation_charge"
      | "admin_adjustment"
      | "refund"
      | "system_adjustment";
    generationId?: string | null;
    subscriptionId?: string | null;
    idempotencyKey?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  return supabaseAdmin.rpc("apply_credit_delta", {
    p_user_id: params.userId,
    p_delta: params.delta,
    p_reason: params.reason,
    p_generation_id: params.generationId ?? null,
    p_subscription_id: params.subscriptionId ?? null,
    p_idempotency_key: params.idempotencyKey ?? null,
    p_metadata: params.metadata ?? {},
  });
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
  // PROFILE (SELF-SERVICE)
  // =============================================

  const updateOwnProfileSchema = z.object({
    full_name: z.string().min(2).max(100).nullable().optional(),
    preferred_locale: z.enum(SUPPORTED_LOCALES).optional(),
  });

  app.get(api.profiles.me.get.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const locale = resolveLocaleFromRequest(req);
      const supabaseAdmin = getSupabaseAdmin();

      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", authReq.userId)
        .single();

      if (error || !data) {
        return res
          .status(404)
          .json({ message: tBackend(locale, "profiles.notFound") });
      }

      data.preferred_locale = resolveLocaleFromProfile(data.preferred_locale);
      res.json(data);
    } catch (error: any) {
      logger.error({ err: error }, "Error fetching own profile");
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
    }
  });

  app.patch(
    api.profiles.me.update.path,
    requireAuth,
    validateRequest(updateOwnProfileSchema),
    async (req, res) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const supabaseAdmin = getSupabaseAdmin();
        const updates = {
          ...req.body,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabaseAdmin
          .from("profiles")
          .update(updates)
          .eq("id", authReq.userId)
          .select("*")
          .single();

        if (error) throw error;

        data.preferred_locale = resolveLocaleFromProfile(data.preferred_locale);
        res.json(data);
      } catch (error: any) {
        logger.error({ err: error }, "Error updating own profile");
        const locale = resolveLocaleFromRequest(req);
        res
          .status(500)
          .json({ message: tBackend(locale, "common.internalServerError") });
      }
    },
  );

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
        .from("template_categories")
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
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
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
          .from("template_categories")
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
          .from("template_categories")
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
          .from("template_categories")
          .select("id")
          .eq("id", req.params.id)
          .single();

        if (category) {
          const { data: usedBy } = await supabaseAdmin
            .from("templates")
            .select("id")
            .eq("category_id", category.id)
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
          .from("template_categories")
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
  app.get(api.templates.marquee.path, async (req, res) => {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin
        .from("templates")
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
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
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
        .from("templates")
        .select("*, template_categories(slug, name)")
        .order("created_at", { ascending: false });

      if (profile?.role !== "admin") {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      res.json((data ?? []).map(toTemplateDto));
    } catch (error: any) {
      logger.error({ err: error }, "Error listing templates");
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
    }
  });

  // GET /api/templates/:id
  app.get(api.templates.get.path, requireAuth, async (req, res) => {
    try {
      const locale = resolveLocaleFromRequest(req);
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin
        .from("templates")
        .select("*, template_categories(slug, name)")
        .eq("id", req.params.id)
        .single();

      if (error || !data) {
        return res
          .status(404)
          .json({ message: tBackend(locale, "templates.notFound") });
      }
      res.json(toTemplateDto(data));
    } catch (error: any) {
      logger.error({ err: error }, "Error fetching template");
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
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
        const payload = await buildTemplatePayload(supabaseAdmin, req.body);
        const slug = await getUniqueTemplateSlug(supabaseAdmin, req.body.name);

        const { data, error } = await supabaseAdmin
          .from("templates")
          .insert({
            ...payload,
            slug,
            input_schema: payload.input_schema ?? {},
            keywords: payload.keywords ?? [],
            created_by: authReq.userId,
          })
          .select("*, template_categories(slug, name)")
          .single();

        if (error) throw error;
        res.status(201).json(toTemplateDto(data));
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
        const { data: current, error: currentErr } = await supabaseAdmin
          .from("templates")
          .select("input_schema")
          .eq("id", req.params.id)
          .single();

        if (currentErr) throw currentErr;

        const payload = await buildTemplatePayload(
          supabaseAdmin,
          req.body,
          current?.input_schema,
        );

        const { data, error } = await supabaseAdmin
          .from("templates")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", req.params.id)
          .select("*, template_categories(slug, name)")
          .single();

        if (error) throw error;
        res.json(toTemplateDto(data));
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
          .from("templates")
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
          .from("templates")
          .update({ [field]: publicUrl, updated_at: new Date().toISOString() })
          .eq("id", templateId)
          .select("*, template_categories(slug, name)")
          .single();

        if (error) throw error;
        res.json(toTemplateDto(data));
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
        const locale = resolveLocaleFromRequest(req);

        // 0. Check generation limits & credits
        const limitResult = await checkGenerationLimits(authReq.userId, locale);
        if (!limitResult.allowed) {
          return res.status(403).json({ message: limitResult.reason });
        }

        // 2. Fetch template
        const { data: template, error: tplErr } = await supabaseAdmin
          .from("templates")
          .select("*")
          .eq("id", template_id)
          .eq("is_active", true)
          .single();

        if (tplErr || !template) {
          return res
            .status(404)
            .json({ message: tBackend(locale, "templates.notFoundOrInactive") });
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

        // Apply global mapping for "Tana" and "92i"
        finalPrompt = finalPrompt.replace(/tanas?|92i/gi, "jolies filles");

        // 3. Call Image API
        const oneshotConfig = getOneshotApiConfig();
        const appSettings = await getAppSettings();
        let externalTaskId: string;
        let provider: "oneshot" | "kie" = "oneshot";

        if (!appSettings.forceKieAi && oneshotConfig.url && oneshotConfig.key) {
          try {
            const oneshotResponse = await createOneshotJob(finalPrompt, {
              aspectRatio: aspect_ratio || "1:1",
            });
            if (oneshotResponse && oneshotResponse.id) {
              externalTaskId = `custom_${oneshotResponse.id}`;
            } else {
              throw new Error("Invalid response from OneshotAPI");
            }
          } catch (err) {
            if (isGoogleAiPromptFlagged(err)) {
              logger.warn(
                { err },
                "OneshotAPI rejected prompt, skipping Kie AI fallback",
              );
              return res.status(422).json({
                code: "PROMPT_POLICY_VIOLATION",
                message: tBackend(locale, "pranks.policyViolation"),
              });
            }

            logger.error({ err }, "OneshotAPI failed, falling back to Kie AI");
            provider = "kie";
            const kieResponse = await createKieTask({
              prompt: finalPrompt,
              aspect_ratio: aspect_ratio || "1:1",
            });
            if (kieResponse.code !== 200 || !kieResponse.data?.taskId) {
              logger.error({ response: kieResponse }, "Kie.ai createTask unexpected response");
              return res
                .status(502)
                .json({ message: tBackend(locale, "pranks.taskCreateFailed") });
            }
            externalTaskId = kieResponse.data.taskId;
          }
        } else {
          provider = "kie";
          const kieResponse = await createKieTask({
            prompt: finalPrompt,
            aspect_ratio: aspect_ratio || "1:1",
          });
          if (kieResponse.code !== 200 || !kieResponse.data?.taskId) {
            logger.error({ response: kieResponse }, "Kie.ai createTask unexpected response");
            return res
              .status(502)
              .json({ message: tBackend(locale, "pranks.taskCreateFailed") });
          }
          externalTaskId = kieResponse.data.taskId;
        }

        // 4. Store in generations, then charge through the credit ledger.
        const { data: prank, error: insertErr } = await supabaseAdmin
          .from("generations")
          .insert({
            user_id: authReq.userId,
            template_id,
            generation_type: "image",
            prompt: finalPrompt,
            final_prompt: finalPrompt,
            provider,
            provider_task_id: externalTaskId,
            status: "processing",
            aspect_ratio,
            credit_cost: 5,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        const { error: deductErr } = await applyCreditDelta(supabaseAdmin, {
          userId: authReq.userId,
          delta: -5,
          reason: "generation_charge",
          generationId: prank.id,
          idempotencyKey: `generation:${prank.id}:charge`,
          metadata: {
            source: "template_generation",
            provider,
            provider_task_id: externalTaskId,
          },
        });

        if (deductErr) {
          await supabaseAdmin
            .from("generations")
            .update({
              status: "failed",
              fail_message: "credit_deduction_failed",
              updated_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            })
            .eq("id", prank.id);
          logger.error({ err: deductErr }, "Failed to deduct credits");
          return res
            .status(500)
            .json({ message: tBackend(locale, "pranks.creditDeductionFailed") });
        }

        // Record generation for limit tracking
        await recordGeneration(authReq.userId);

        res.status(201).json({
          id: prank.id,
          taskId: externalTaskId,
          status: "waiting",
          isSubscriber: limitResult.isSubscriber,
        });
      } catch (error: any) {
        logger.error({ err: error }, "Error generating prank");
        const locale = resolveLocaleFromRequest(req);
        res
          .status(500)
          .json({ message: tBackend(locale, "common.internalServerError") });
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
        let { prompt, aspect_ratio, images, template_id } = req.body;
        const locale = resolveLocaleFromRequest(req);
        
        // Apply global mapping for "Tana" and "92i"
        prompt = prompt.replace(/tanas?|92i/gi, "jolies filles");
        
        const supabaseAdmin = getSupabaseAdmin();

        // 0. Check generation limits & credits
        const limitResult = await checkGenerationLimits(authReq.userId, locale);
        if (!limitResult.allowed) {
          return res.status(403).json({ message: limitResult.reason });
        }

        // 2. Upload images to R2 and get public URLs
        let imageUrls: string[] = [];
        if (images && images.length > 0) {
          const { uploadToR2 } = await import("./lib/r2-client");
          for (let i = 0; i < images.length; i++) {
            const dataUrl = images[i];
            const match = dataUrl.match(
              /^data:(image\/[\w+.-]+);base64,([\s\S]+)$/,
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

        // 3. Call Image API
        const oneshotConfig = getOneshotApiConfig();
        const appSettings = await getAppSettings();
        let externalTaskId: string;
        let provider: "oneshot" | "kie" = "oneshot";

        if (!appSettings.forceKieAi && oneshotConfig.url && oneshotConfig.key) {
          try {
            // Upload images to OneshotAPI servers if any
            let referenceFileIds: string[] = [];
            if (imageUrls.length > 0) {
              logger.info({ imageCount: imageUrls.length }, "Uploading images to OneshotAPI");
              for (const publicUrl of imageUrls) {
                try {
                  const imgResp = await fetch(publicUrl);
                  if (!imgResp.ok) throw new Error(`Failed to download ${publicUrl}`);
                  const contentType = imgResp.headers.get("content-type") || "image/jpeg";
                  const arrBuf = await imgResp.arrayBuffer();
                  const buffer = Buffer.from(arrBuf);
                  const filename = publicUrl.split("/").pop() || "image.jpg";
                  const fileId = await uploadToOneshotApi(buffer, filename, contentType);
                  referenceFileIds.push(fileId);
                } catch (uploadErr) {
                  logger.error({ err: uploadErr, publicUrl }, "Failed to upload image to OneshotAPI");
                }
              }
            }

            logger.info({ imageCount: imageUrls.length, referenceFileIds }, "Calling OneshotAPI");
            const oneshotResponse = await createOneshotJob(prompt, {
              aspectRatio: aspect_ratio || "9:16",
              ...(referenceFileIds.length > 0 ? { referenceFileIds } : {}),
            });
            if (oneshotResponse && oneshotResponse.id) {
              externalTaskId = `custom_${oneshotResponse.id}`;
            } else {
              throw new Error("Invalid response from OneshotAPI");
            }
          } catch (err) {
            if (isGoogleAiPromptFlagged(err)) {
              logger.warn(
                { err },
                "OneshotAPI rejected prompt, skipping Kie AI fallback",
              );
              return res.status(422).json({
                code: "PROMPT_POLICY_VIOLATION",
                message: tBackend(locale, "pranks.policyViolation"),
              });
            }

            logger.error({ err }, "OneshotAPI failed, falling back to Kie AI");
            provider = "kie";
            const kieResponse = await createKieTask({
              prompt,
              aspect_ratio: aspect_ratio || "9:16",
              ...(imageUrls.length > 0 ? { image_input: imageUrls } : {}),
            });
            if (kieResponse.code !== 200 || !kieResponse.data?.taskId) {
              logger.error({ response: kieResponse }, "Kie.ai createTask unexpected response");
              return res
                .status(502)
                .json({ message: tBackend(locale, "pranks.taskCreateFailed") });
            }
            externalTaskId = kieResponse.data.taskId;
          }
        } else {
          provider = "kie";
          logger.info({ imageCount: imageUrls.length, imageUrls }, "Calling Kie.ai with images");
          const kieResponse = await createKieTask({
            prompt,
            aspect_ratio: aspect_ratio || "9:16",
            ...(imageUrls.length > 0 ? { image_input: imageUrls } : {}),
          });

          if (kieResponse.code !== 200 || !kieResponse.data?.taskId) {
            logger.error({ response: kieResponse }, "Kie.ai createTask unexpected response");
            return res
              .status(502)
              .json({ message: tBackend(locale, "pranks.taskCreateFailed") });
          }
          externalTaskId = kieResponse.data.taskId;
        }

        // 4. Store in generations, then charge through the credit ledger.
        const { data: prank, error: insertErr } = await supabaseAdmin
          .from("generations")
          .insert({
            user_id: authReq.userId,
            template_id: template_id || null,
            generation_type: "image",
            prompt,
            final_prompt: prompt,
            provider,
            provider_task_id: externalTaskId,
            status: "processing",
            aspect_ratio,
            input_assets: imageUrls,
            credit_cost: 5,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        const { error: deductErr } = await applyCreditDelta(supabaseAdmin, {
          userId: authReq.userId,
          delta: -5,
          reason: "generation_charge",
          generationId: prank.id,
          idempotencyKey: `generation:${prank.id}:charge`,
          metadata: {
            source: "direct_generation",
            provider,
            provider_task_id: externalTaskId,
          },
        });

        if (deductErr) {
          await supabaseAdmin
            .from("generations")
            .update({
              status: "failed",
              fail_message: "credit_deduction_failed",
              updated_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            })
            .eq("id", prank.id);
          logger.error({ err: deductErr }, "Failed to deduct credits");
          return res
            .status(500)
            .json({ message: tBackend(locale, "pranks.creditDeductionFailed") });
        }

        // Record generation for limit tracking
        await recordGeneration(authReq.userId);

        res.status(201).json({
          id: prank.id,
          taskId: externalTaskId,
          status: "waiting",
          isSubscriber: limitResult.isSubscriber,
        });
      } catch (error: any) {
        logger.error({ err: error }, "Error generating direct prank");
        const locale = resolveLocaleFromRequest(req);
        res
          .status(500)
          .json({ message: tBackend(locale, "common.internalServerError") });
      }
    },
  );

  // ── Video generation constants ────────────────────────────────
  const VIDEO_CREDIT_COST = 30;

  // POST /api/pranks/generate-video
  app.post(
    api.pranks.generateVideo.path,
    requireAuth,
    generateLimiter,
    validateRequest(generateVideoBodySchema),
    async (req, res) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const { prompt, images } = req.body;
        const locale = resolveLocaleFromRequest(req);
        const supabaseAdmin = getSupabaseAdmin();

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("role, is_subscriber")
          .eq("id", authReq.userId)
          .single();
        const isAdmin = profile?.role === "admin";

        if (!isAdmin && !profile?.is_subscriber) {
          return res.status(403).json({
            code: "SUBSCRIPTION_REQUIRED",
            message: tBackend(locale, "stripe.videoPlanRequired"),
          });
        }

        // 1. Check generation limits (30 credits for video)
        const limitResult = await checkGenerationLimits(
          authReq.userId,
          locale,
          VIDEO_CREDIT_COST,
        );
        if (!limitResult.allowed) {
          return res.status(403).json({ message: limitResult.reason });
        }

        // 2. Upload optional reference image to R2
        let imageUrl: string | undefined;
        if (images && images.length > 0) {
          const dataUrl = images[0];
          const match = dataUrl.match(
            /^data:(image\/[\w+.-]+);base64,([\s\S]+)$/,
          );
          if (match) {
            const contentType = match[1];
            const base64Data = match[2];
            const buffer = Buffer.from(base64Data, "base64");
            const ext = contentType.split("/")[1] || "jpg";
            const key = `inputs/${authReq.userId}/${Date.now()}-ref.${ext}`;
            imageUrl = await uploadToR2(key, buffer, contentType);
          }
        }

        // 3. Call KIE Runway API
        const runwayResponse = await createRunwayVideoTask({
          prompt,
          image: imageUrl,
        });

        if (runwayResponse.code !== 200 || !runwayResponse.data?.task_id) {
          const msg = (runwayResponse as any).msg || tBackend(locale, "pranks.taskCreateFailed");
          return res.status(422).json({ message: msg });
        }

        // 4. Store in generations, then charge through the credit ledger.
        const externalTaskId = `video_${runwayResponse.data.task_id}`;
        const { data: prank, error: insertErr } = await supabaseAdmin
          .from("generations")
          .insert({
            user_id: authReq.userId,
            template_id: null,
            generation_type: "video",
            prompt,
            final_prompt: prompt,
            provider: "runway",
            provider_task_id: externalTaskId,
            status: "processing",
            input_assets: imageUrl ? [imageUrl] : [],
            credit_cost: VIDEO_CREDIT_COST,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        const { error: deductErr } = await applyCreditDelta(supabaseAdmin, {
          userId: authReq.userId,
          delta: -VIDEO_CREDIT_COST,
          reason: "generation_charge",
          generationId: prank.id,
          idempotencyKey: `generation:${prank.id}:charge`,
          metadata: {
            source: "video_generation",
            provider: "runway",
            provider_task_id: externalTaskId,
          },
        });
        if (deductErr) {
          await supabaseAdmin
            .from("generations")
            .update({
              status: "failed",
              fail_message: "credit_deduction_failed",
              updated_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            })
            .eq("id", prank.id);
          logger.error({ err: deductErr }, "Failed to deduct credits");
          return res
            .status(500)
            .json({ message: tBackend(locale, "pranks.creditDeductionFailed") });
        }

        await recordGeneration(authReq.userId);

        res.status(201).json({
          id: prank.id,
          taskId: externalTaskId,
          status: "waiting",
          isSubscriber: limitResult.isSubscriber,
        });
      } catch (error: any) {
        if (error instanceof RunwayApiError) {
          return res.status(422).json({ message: error.apiMsg });
        }
        logger.error({ err: error, stack: error?.stack }, "[VIDEO] Handler crashed");
        const locale = resolveLocaleFromRequest(req);
        res
          .status(500)
          .json({ message: tBackend(locale, "common.internalServerError") });
      }
    },
  );

  // GET /api/pranks/can-generate
  app.get(api.pranks.canGenerate.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const locale = resolveLocaleFromRequest(req);
      const result = await checkGenerationLimits(authReq.userId, locale);
      res.json({
        canGenerate: result.allowed,
        isSubscriber: result.isSubscriber,
        generationCount: result.generationCount,
        reason: result.reason,
      });
    } catch (error: any) {
      logger.error({ err: error }, "Error checking generation eligibility");
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
    }
  });

  // GET /api/pranks/:taskId/status
  app.get(api.pranks.status.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const locale = resolveLocaleFromRequest(req);
      const { taskId } = req.params;
      const supabaseAdmin = getSupabaseAdmin();

      // Verify this task belongs to the user
      const { data: prank, error: fetchErr } = await supabaseAdmin
        .from("generations")
        .select("*")
        .ilike("provider_task_id", `%${taskId}%`)
        .eq("user_id", authReq.userId)
        .single();

      if (fetchErr || !prank) {
        return res
          .status(404)
          .json({ message: tBackend(locale, "pranks.taskNotFound") });
      }

      // If already terminal, return cached result
      if (prank.status === "succeeded" || prank.status === "failed") {
        // Check subscriber status for watermark decision
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("is_subscriber, role")
          .eq("id", authReq.userId)
          .single();
        const isSubscriber =
          profile?.is_subscriber || profile?.role === "admin";

        const originals = Array.isArray(prank.output_assets)
          ? prank.output_assets
          : [];
        const watermarkedList = Array.isArray(prank.watermarked_assets)
          ? prank.watermarked_assets
          : originals;

        return res.json({
          prankId: prank.id,
          status: toLegacyStatus(prank.status),
          resultUrls: originals,
          watermarkedUrls: watermarkedList,
          failMessage: prank.fail_message,
          costTime: prank.cost_time,
          isSubscriber,
          requiresPaywall: false,
        });
      }

      const activeTaskId = (prank.provider_task_id || "").split(",").pop() as string;
      const isCustomApi = activeTaskId.startsWith("custom_");
      const isVideoTask = activeTaskId.startsWith("video_");

      let apiStatus: "waiting" | "success" | "fail" = "waiting";
      let apiResultJson: any = null;
      let apiFailMsg: string | null = null;
      let apiCostTime: number | null = null;
      const resultType: "image" | "video" = isVideoTask ? "video" : "image";

      if (isVideoTask) {
        const runwayTaskId = activeTaskId.replace("video_", "");
        try {
          const runwayStatus = await getRunwayVideoStatus(runwayTaskId);
          const sd = runwayStatus.data;
          const state = sd.state ?? sd.status;
          const videoUrl = sd.videoInfo?.videoUrl ?? sd.video_url;
          apiStatus = state === "success" || state === "completed"
            ? "success"
            : state === "fail" || state === "failed"
              ? "fail"
              : "waiting";
          if (videoUrl) {
            apiResultJson = JSON.stringify({ video_url: videoUrl });
          }
          if (sd.failMsg || sd.fail_reason) {
            apiFailMsg = sd.failMsg ?? sd.fail_reason ?? null;
          }
        } catch (err) {
          logger.error({ err }, "Failed to poll KIE Runway");
          apiStatus = "fail";
          apiFailMsg = tBackend(locale, "pranks.pollingError");
        }
      } else if (isCustomApi) {
        const jobId = activeTaskId.replace("custom_", "");
        let customStatus: any;
        try {
          customStatus = await getOneshotJobStatus(jobId);
        } catch (err) {
          logger.error({ err }, "Failed to poll OneshotAPI");
          customStatus = {
            status: "failed",
            error: isGoogleAiPromptFlagged(err)
              ? err instanceof Error
                ? err.message
                : String(err)
              : tBackend(locale, "pranks.pollingError"),
          };
        }
        
        const currentSettings = await getAppSettings();
        const ageInMs = Date.now() - new Date(prank.created_at).getTime();
        const isTimeout = ageInMs > currentSettings.fallbackTimeoutMs;
        const isCustomApiFailed =
          customStatus.status === "failed" || customStatus.status === "fail";
        const isPolicyViolation =
          isCustomApiFailed && isGoogleAiPromptFlagged(customStatus);

        if (customStatus.status === "completed" || customStatus.status === "success") {
          apiStatus = "success";
          apiResultJson = JSON.stringify(customStatus);
        } else if (isCustomApiFailed || isTimeout) {
          if (isPolicyViolation) {
            logger.warn(
              { prankId: prank.id, jobId },
              "OneshotAPI rejected prompt, skipping Kie AI fallback",
            );
            apiStatus = "fail";
            apiFailMsg = tBackend(locale, "pranks.policyViolation");
          } else {
            logger.info(
              { prankId: prank.id, isTimeout },
              "Custom API failed or timeout, triggering Kie AI fallback",
            );
            try {
              const aspect_ratio = prank.aspect_ratio || "9:16";
              const imageUrls = Array.isArray(prank.input_assets) ? prank.input_assets : [];
              const fallbackKieResponse = await createKieTask({
                prompt: prank.final_prompt,
                aspect_ratio,
                ...(imageUrls.length > 0 ? { image_input: imageUrls } : {}),
              });
             
              if (fallbackKieResponse.code === 200 && fallbackKieResponse.data?.taskId) {
                const newKieTaskIdString = `${prank.provider_task_id},${fallbackKieResponse.data.taskId}`;
                await supabaseAdmin
                  .from("generations")
                  .update({
                    provider: "fallback",
                    provider_task_id: newKieTaskIdString,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", prank.id);
                 
                return res.json({
                  prankId: prank.id,
                  status: "waiting",
                  resultUrls: [],
                  failMessage: null,
                  costTime: null,
                  isSubscriber: false,
                  requiresPaywall: false,
                });
              } else {
                apiStatus = "fail";
                apiFailMsg = tBackend(locale, "pranks.fallbackFailed");
              }
            } catch (fallbackErr: any) {
              logger.error({ err: fallbackErr }, "Kie fallback also failed");
              apiStatus = "fail";
              apiFailMsg = tBackend(locale, "pranks.fallbackFailed");
            }
          }
        }
      } else {
        try {
          const kieStatus = await getKieTaskStatus(activeTaskId);
          apiStatus = kieStatus.data.state;
          if (kieStatus.data.resultJson) {
            apiResultJson = kieStatus.data.resultJson;
          }
          apiFailMsg = kieStatus.data.failMsg;
          apiCostTime = kieStatus.data.costTime;
        } catch (err: any) {
           logger.error({ err }, "Failed to poll Kie.ai");
           apiStatus = "fail";
            apiFailMsg = tBackend(locale, "pranks.pollingError");
        }
      }

      if (
        apiStatus === "success" ||
        apiStatus === "fail"
      ) {
        let resultUrls: string[] = [];
        let watermarkedUrls: string[] = [];
        if (apiStatus === "success" && apiResultJson) {
          try {
            const parsed = typeof apiResultJson === "string" ? JSON.parse(apiResultJson) : apiResultJson;

            // ── Video: extract video URL and store to R2 ──────────
            if (isVideoTask && (parsed as any).video_url) {
              const videoUrl = (parsed as any).video_url as string;
              try {
                const response = await fetch(videoUrl);
                if (!response.ok) throw new Error(`Failed to download video: ${response.status}`);
                const contentType = response.headers.get("content-type") || "video/mp4";
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const key = `pranks/${prank.id}/video.mp4`;
                const { uploadToR2 } = await import("./lib/r2-client");
                resultUrls = [await uploadToR2(key, buffer, contentType)];
              } catch (err) {
                logger.error({ err, videoUrl }, "Failed to store video to R2, using direct URL");
                resultUrls = [videoUrl];
              }
            } else {
              // ── Image: use existing extraction ────────────────────
              resultUrls = extractImageUrls(parsed);
            }
          } catch (parseErr) {
            logger.error(
              { err: parseErr, rawResultJson: apiResultJson },
              "Failed to parse API resultJson",
            );
          }

          if (!isVideoTask && resultUrls.length > 0) {
            try {
              resultUrls = await downloadAndStoreImages(prank.id, resultUrls);
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
        const isSubscriber =
          profile?.is_subscriber || profile?.role === "admin";

        // Update record
        await supabaseAdmin
          .from("generations")
          .update({
            status: toDbStatus(apiStatus),
            output_assets: resultUrls,
            watermarked_assets: watermarkedUrls.length > 0 ? watermarkedUrls : [],
            fail_message: apiFailMsg || null,
            cost_time: apiCostTime
              ? String(apiCostTime)
              : null,
            updated_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .eq("id", prank.id);

        return res.json({
          prankId: prank.id,
          status: apiStatus,
          resultUrls: resultUrls,
          failMessage: apiFailMsg,
          costTime: apiCostTime,
          isSubscriber,
          requiresPaywall: false,
          resultType,
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
        resultType,
      });
    } catch (error: any) {
      logger.error({ err: error }, "Error checking prank status");
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
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
        .from("generations")
        .select("*, templates(name, template_categories(slug))")
        .eq("user_id", authReq.userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      res.json((data ?? []).map(toLegacyPrankDto));
    } catch (error: any) {
      logger.error({ err: error }, "Error fetching prank history");
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
    }
  });

  // GET /api/pranks/:prankId/download/:imageIndex
  app.get(api.pranks.download.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const locale = resolveLocaleFromRequest(req);
      const { prankId, imageIndex } = req.params;
      const index = parseInt(imageIndex, 10);
      const supabaseAdmin = getSupabaseAdmin();

      if (isNaN(index) || index < 0) {
        return res
          .status(400)
          .json({ message: tBackend(locale, "pranks.invalidImageIndex") });
      }

      const { data: prank, error } = await supabaseAdmin
        .from("generations")
        .select("output_assets, watermarked_assets")
        .eq("id", prankId)
        .eq("user_id", authReq.userId)
        .single();

      if (
        error ||
        !prank ||
        !Array.isArray(prank.output_assets) ||
        prank.output_assets.length === 0
      ) {
        return res
          .status(404)
          .json({ message: tBackend(locale, "pranks.notFound") });
      }

      // Check subscriber status — non-subscribers get watermarked version
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_subscriber, role")
        .eq("id", authReq.userId)
        .single();
      const isSubscriber = profile?.is_subscriber || profile?.role === "admin";

      const urls = isSubscriber
        ? prank.output_assets
        : Array.isArray(prank.watermarked_assets) && prank.watermarked_assets.length > 0
          ? prank.watermarked_assets
          : prank.output_assets;

      if (index >= urls.length) {
        return res
          .status(404)
          .json({ message: tBackend(locale, "pranks.imageNotFound") });
      }

      const imageUrl = urls[index];
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return res
          .status(502)
          .json({ message: tBackend(locale, "pranks.fetchImageFailed") });
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
        `attachment; filename="larp-${randomSuffix}.${extension}"`,
      );
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

      const arrayBuffer = await imageResponse.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      logger.error({ err: error }, "Error downloading prank image");
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
    }
  });

  // DELETE /api/pranks/:prankId
  app.delete(api.pranks.delete.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { prankId } = req.params;
      const supabaseAdmin = getSupabaseAdmin();

      const { error } = await supabaseAdmin
        .from("generations")
        .delete()
        .eq("id", prankId)
        .eq("user_id", authReq.userId);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "Error deleting prank");
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
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
        const authReq = req as AuthenticatedRequest;
        const { user_id, amount } = req.body;
        const supabaseAdmin = getSupabaseAdmin();

        const { data, error } = await applyCreditDelta(supabaseAdmin, {
          userId: user_id,
          delta: amount,
          reason: "admin_adjustment",
          idempotencyKey: `admin:${authReq.userId}:${user_id}:${Date.now()}`,
          metadata: {
            source: "admin_credit_adjustment",
            admin_user_id: authReq.userId,
          },
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
    admin_plan: z.enum(["free", "weekly", "monthly", "image", "video"]).optional(),
  });

  app.patch(
    api.admin.updateUser.path,
    requireAuth,
    requireAdmin,
    validateRequest(updateUserBodySchema),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { admin_plan, ...profileUpdates } = req.body;
        const supabaseAdmin = getSupabaseAdmin();

        if (admin_plan) {
          if (admin_plan === "free") {
            profileUpdates.is_subscriber = false;
            profileUpdates.subscription_status = "canceled";
          } else {
            const { getStripePlanConfig } = await import("./lib/stripe");
            const planConfig = getStripePlanConfig(admin_plan);

            profileUpdates.is_subscriber = true;
            profileUpdates.subscription_status = "active";

            const { data: profile } = await supabaseAdmin
              .from("profiles")
              .select("stripe_subscription_id, stripe_customer_id")
              .eq("id", id)
              .single();

            await supabaseAdmin.from("subscriptions").upsert(
              {
                user_id: id,
                stripe_subscription_id: profile?.stripe_subscription_id || `admin_override_${id}`,
                stripe_customer_id: profile?.stripe_customer_id || `admin_override_${id}`,
                status: "active",
                price_id: planConfig.priceId,
                plan_type: planConfig.planType,
                credits_per_cycle: planConfig.creditsPerCycle,
                billing_interval: planConfig.billingInterval,
                canceled_at: null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "stripe_subscription_id" },
            );
          }
        }

        const { data, error } = await supabaseAdmin
          .from("profiles")
          .update(profileUpdates)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        if (admin_plan === "free") {
          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "canceled",
              canceled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", id)
            .in("status", ["active", "trialing"]);
        }

        res.json(data);
      } catch (error: any) {
        logger.error({ err: error }, "Error updating user profile");
        res.status(500).json({ message: error.message });
      }
    },
  );

  // DELETE /api/admin/users/:id (Admin only) — delete a user and their auth entry
  app.delete(
    api.admin.deleteUser.path,
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const supabaseAdmin = getSupabaseAdmin();

        // Delete profile first (cascade will handle related data)
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .delete()
          .eq("id", id);

        if (profileError) throw profileError;

        // Delete the auth user entry
        const { error: authError } =
          await supabaseAdmin.auth.admin.deleteUser(id);
        if (authError) throw authError;

        res.json({ message: "Utilisateur supprimé" });
      } catch (error: any) {
        logger.error({ err: error }, "Error deleting user");
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
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
    }
  });

  // POST /api/favorites/:templateId - Add a favorite
  app.post(api.favorites.add.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const locale = resolveLocaleFromRequest(req);
      const supabaseAdmin = getSupabaseAdmin();

      const { error } = await supabaseAdmin
        .from("favorite_templates")
        .upsert(
          { user_id: authReq.userId, template_id: req.params.templateId },
          { onConflict: "user_id,template_id" },
        );

      if (error) throw error;
      res.json({ message: tBackend(locale, "favorites.added") });
    } catch (error: any) {
      logger.error({ err: error }, "Error adding favorite");
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
    }
  });

  // DELETE /api/favorites/:templateId - Remove a favorite
  app.delete(api.favorites.remove.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const locale = resolveLocaleFromRequest(req);
      const supabaseAdmin = getSupabaseAdmin();

      const { error } = await supabaseAdmin
        .from("favorite_templates")
        .delete()
        .eq("user_id", authReq.userId)
        .eq("template_id", req.params.templateId);

      if (error) throw error;
      res.json({ message: tBackend(locale, "favorites.removed") });
    } catch (error: any) {
      logger.error({ err: error }, "Error removing favorite");
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
    }
  });

  // =============================================
  // STRIPE BILLING
  // =============================================
  registerStripeRoutes(app);

  // =============================================
  // ADMIN SETTINGS ENDPOINTS
  // =============================================

  // GET /api/admin/settings
  app.get(
    api.admin.getSettings.path,
    requireAuth,
    requireAdmin,
    async (_req, res) => {
      try {
        const settings = await getAppSettings();
        res.json(settings);
      } catch (error: any) {
        logger.error({ err: error }, "Error fetching admin settings");
        res.status(500).json({ message: error.message });
      }
    },
  );

  // PATCH /api/admin/settings
  const updateSettingsSchema = z.object({
    forceKieAi: z.boolean().optional(),
    fallbackTimeoutMs: z.number().int().min(30000).max(600000).optional(),
  });

  app.patch(
    api.admin.updateSettings.path,
    requireAuth,
    requireAdmin,
    validateRequest(updateSettingsSchema),
    async (req, res) => {
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const { forceKieAi, fallbackTimeoutMs } = req.body;

        if (forceKieAi !== undefined) {
          await supabaseAdmin
            .from("app_settings")
            .upsert({ key: "force_kie_ai", value: String(forceKieAi), updated_at: new Date().toISOString() }, { onConflict: "key" });
        }

        if (fallbackTimeoutMs !== undefined) {
          await supabaseAdmin
            .from("app_settings")
            .upsert({ key: "fallback_timeout_ms", value: String(fallbackTimeoutMs), updated_at: new Date().toISOString() }, { onConflict: "key" });
        }

        // Bust cache so next request uses fresh values
        invalidateSettingsCache();

        const settings = await getAppSettings();
        res.json(settings);
      } catch (error: any) {
        logger.error({ err: error }, "Error updating admin settings");
        res.status(500).json({ message: error.message });
      }
    },
  );

  return httpServer;
}
