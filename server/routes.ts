import type { Express } from "express";
import type { Server } from "http";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { api } from "@shared/routes";
import { z } from "zod";
import { SUPPORTED_LOCALES, type AppLocale } from "@shared/locales";

import { validateRequest } from "./lib/validate";
import {
  insertPromptTemplateSchema,
  updatePromptTemplateSchema,
  insertCategorySchema,
  updateCategorySchema,
  generateVideoBodySchema,
  uploadReferenceImageItemSchema,
  updateReferenceImageSchema,
  OUTPUT_ASPECT_RATIO,
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
import { inferDownloadMediaMeta } from "./lib/media-download";
import { listPublicR2Objects, uploadToR2 } from "./lib/r2-client";
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

const IMAGE_CREDIT_COST = 10;
const VIDEO_CREDIT_COST = 25;
// While polling a generation, a transient provider/network error within this
// window is treated as "still running" instead of a permanent failure.
const PROVIDER_POLL_HARD_TIMEOUT_MS = 12 * 60 * 1000;
const FACE_CAPTURE_BUCKET = "face-captures";
const FACE_CAPTURE_POSES = ["frontal", "profile-right", "profile-left"] as const;
const MAX_FACE_CAPTURE_BYTES = 10 * 1024 * 1024;
const MAX_TEMPLATE_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;
const TEMPLATE_REFERENCE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const faceLandmarkSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number().optional(),
  visibility: z.number().optional(),
});

const faceCaptureBodySchema = z.object({
  captures: z
    .array(
      z.object({
        poseId: z.enum(FACE_CAPTURE_POSES),
        imageBase64: z.string().min(1),
        timestamp: z.number(),
        landmarks: z.array(faceLandmarkSchema).optional().default([]),
        landmarkFrameWidth: z.number().nullable().optional(),
        landmarkFrameHeight: z.number().nullable().optional(),
      }),
    )
    .length(FACE_CAPTURE_POSES.length),
});

function decodeJpegBase64(input: string): Buffer {
  const base64 = input.includes(",") ? input.split(",").pop() ?? "" : input;
  const buffer = Buffer.from(base64, "base64");

  if (
    buffer.length === 0 ||
    buffer.length > MAX_FACE_CAPTURE_BYTES ||
    buffer[0] !== 0xff ||
    buffer[1] !== 0xd8
  ) {
    throw new Error("invalid_face_capture_image");
  }

  return buffer;
}

function isFaceCapturePose(poseId: string): poseId is (typeof FACE_CAPTURE_POSES)[number] {
  return FACE_CAPTURE_POSES.includes(poseId as (typeof FACE_CAPTURE_POSES)[number]);
}

async function getLatestFaceCaptureSession(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("face_capture_sessions")
    .select("id, created_at, status")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getFaceCaptureAssetsForSession(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  sessionId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("face_capture_assets")
    .select("pose_id, storage_bucket, storage_path, content_type, byte_size, created_at")
    .eq("user_id", userId)
    .eq("session_id", sessionId);

  if (error) throw error;
  return data ?? [];
}

async function deleteFaceCaptureSessionsForUser(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  sessionIds: string[],
) {
  const uniqueSessionIds = Array.from(new Set(sessionIds)).filter(Boolean);

  if (uniqueSessionIds.length === 0) {
    return 0;
  }

  const { data: assets, error: assetsError } = await supabaseAdmin
    .from("face_capture_assets")
    .select("storage_bucket, storage_path")
    .eq("user_id", userId)
    .in("session_id", uniqueSessionIds);

  if (assetsError) throw assetsError;

  const paths = Array.from(
    new Set(
      (assets ?? [])
        .filter((asset) => asset.storage_bucket === FACE_CAPTURE_BUCKET)
        .map((asset) => asset.storage_path)
        .filter(Boolean),
    ),
  );

  if (paths.length > 0) {
    const { error: storageError } = await supabaseAdmin.storage
      .from(FACE_CAPTURE_BUCKET)
      .remove(paths);

    if (storageError) throw storageError;
  }

  const { error: deleteError } = await supabaseAdmin
    .from("face_capture_sessions")
    .delete()
    .eq("user_id", userId)
    .in("id", uniqueSessionIds);

  if (deleteError) throw deleteError;

  return uniqueSessionIds.length;
}

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

function normalizeUrlForComparison(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url.split("?")[0].split("#")[0];
  }
}

/**
 * Resolve the generated image URL(s) that must feed the Runway video stage.
 *
 * Reuses the proven `extractImageUrls` extractor (which already walks the
 * provider payload in output-priority order) and then removes any URL that
 * merely echoes an input asset (uploaded photo, template reference, or the
 * face-capture composite). This guarantees Runway never receives an input
 * image instead of the freshly generated one.
 */
function extractGeneratedImageUrlsForVideoStage(
  parsed: unknown,
  originalInputUrls: string[],
): string[] {
  const originalInputSet = new Set(
    originalInputUrls
      .filter((url): url is string => typeof url === "string" && url.length > 0)
      .map(normalizeUrlForComparison),
  );

  return extractImageUrls(parsed).filter(
    (url) => !originalInputSet.has(normalizeUrlForComparison(url)),
  );
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

function toAssetList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value !== "string" || value.trim() === "") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function toClientGenerationStatus(
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

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type ImageGenerationProvider = "oneshot" | "kie";

interface StartedImageGenerationTask {
  provider: ImageGenerationProvider;
  providerTaskId: string;
}

interface ImageGenerationPollResult {
  status: "waiting" | "success" | "fail";
  resultJson: any;
  failMsg: string | null;
  costTime: number | null;
  providerTaskUpdated?: boolean;
}

function getGenerationMetadata(row: { metadata?: unknown }) {
  return typeof row.metadata === "object" && row.metadata !== null
    ? (row.metadata as Record<string, unknown>)
    : {};
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0)),
  );
}

async function composeFaceCaptureImageBuffers(buffers: Buffer[]): Promise<Buffer> {
  if (buffers.length !== FACE_CAPTURE_POSES.length) {
    throw new Error("FACE_CAPTURE_REQUIRED");
  }

  const targetHeight = 1024;
  const panelWidth = Math.round((targetHeight * 9) / 16);
  const resized = await Promise.all(
    buffers.map(async (buffer) => {
      const input = await sharp(buffer)
        .rotate()
        .resize({
          width: panelWidth,
          height: targetHeight,
          fit: "cover",
          position: "center",
        })
        .jpeg({ quality: 92 })
        .toBuffer();
      return { input, width: panelWidth };
    }),
  );

  const width = resized.reduce((sum, item) => sum + item.width, 0);
  let left = 0;
  const composite = resized.map((item) => {
    const placement = { input: item.input, left, top: 0 };
    left += item.width;
    return placement;
  });

  return sharp({
    create: {
      width,
      height: targetHeight,
      channels: 3,
      background: "#ffffff",
    },
  })
    .composite(composite)
    .jpeg({ quality: 92 })
    .toBuffer();
}

async function resolveUserFaceCaptureImageUrls(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
): Promise<string[] | null> {
  const session = await getLatestFaceCaptureSession(supabaseAdmin, userId);
  if (!session) return null;

  const assets = await getFaceCaptureAssetsForSession(
    supabaseAdmin,
    userId,
    session.id,
  );
  const ordered = FACE_CAPTURE_POSES.map((poseId) =>
    assets.find((asset) => asset.pose_id === poseId),
  );
  if (ordered.some((asset) => !asset)) return null;

  const buffers = await Promise.all(ordered.map(async (asset) => {
    const { data: imageBlob, error: downloadError } = await supabaseAdmin.storage
      .from(asset!.storage_bucket)
      .download(asset!.storage_path);

    if (downloadError) throw downloadError;

    return Buffer.from(await imageBlob.arrayBuffer());
  }));

  const composite = await composeFaceCaptureImageBuffers(buffers);
  const key = `inputs/${userId}/face-capture/composite-${Date.now()}.jpg`;
  return [await uploadToR2(key, composite, "image/jpeg")];
}

async function uploadInputImagesToR2(
  userId: string,
  images: string[] | undefined,
): Promise<string[]> {
  if (!images || images.length === 0) return [];

  const uploaded = await Promise.all(images.map(async (dataUrl, i) => {
    const match = dataUrl.match(/^data:(image\/[\w+.-]+);base64,([\s\S]+)$/);
    if (!match) {
      logger.warn(
        { index: i, prefix: dataUrl.substring(0, 40) },
        "Invalid base64 image, skipping",
      );
      return null;
    }

    const contentType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, "base64");
    const ext = contentType.split("/")[1] || "jpg";
    const key = `inputs/${userId}/${Date.now()}-${i}.${ext}`;
    return uploadToR2(key, buffer, contentType);
  }));

  return uploaded.filter((url): url is string => typeof url === "string");
}

async function uploadImageUrlsToOneshot(imageUrls: string[]): Promise<string[]> {
  const referenceFileIds = await Promise.all(imageUrls.map(async (publicUrl) => {
    try {
      const imgResp = await fetch(publicUrl);
      if (!imgResp.ok) throw new Error(`Failed to download ${publicUrl}`);
      const contentType = imgResp.headers.get("content-type") || "image/jpeg";
      const arrBuf = await imgResp.arrayBuffer();
      const buffer = Buffer.from(arrBuf);
      const filename = publicUrl.split("/").pop() || "image.jpg";
      return uploadToOneshotApi(buffer, filename, contentType);
    } catch (uploadErr) {
      logger.error(
        { err: uploadErr, publicUrl },
        "Failed to upload image to OneshotAPI",
      );
      return null;
    }
  }));

  return referenceFileIds.filter((id): id is string => typeof id === "string");
}

async function startImageGenerationTask(params: {
  prompt: string;
  aspectRatio: string;
  imageUrls: string[];
}): Promise<StartedImageGenerationTask> {
  const oneshotConfig = getOneshotApiConfig();
  const appSettings = await getAppSettings();

  if (!appSettings.forceKieAi && oneshotConfig.url && oneshotConfig.key) {
    try {
      const referenceFileIds = params.imageUrls.length
        ? await uploadImageUrlsToOneshot(params.imageUrls)
        : [];
      const oneshotResponse = await createOneshotJob(params.prompt, {
        aspectRatio: params.aspectRatio,
        ...(referenceFileIds.length > 0 ? { referenceFileIds } : {}),
      });
      if (oneshotResponse?.id) {
        return {
          provider: "oneshot",
          providerTaskId: `custom_${oneshotResponse.id}`,
        };
      }
      throw new Error("Invalid response from OneshotAPI");
    } catch (err) {
      if (isGoogleAiPromptFlagged(err)) {
        throw err;
      }
      logger.error(
        { err },
        "OneshotAPI failed while starting chained video image, falling back to Kie AI",
      );
    }
  }

  const kieResponse = await createKieTask({
    prompt: params.prompt,
    aspect_ratio: params.aspectRatio,
    ...(params.imageUrls.length > 0 ? { image_input: params.imageUrls } : {}),
  });

  if (kieResponse.code !== 200 || !kieResponse.data?.taskId) {
    logger.error(
      { response: kieResponse },
      "Kie.ai createTask unexpected response for chained video image",
    );
    throw new Error("Kie.ai image task creation failed");
  }

  return {
    provider: "kie",
    providerTaskId: kieResponse.data.taskId,
  };
}

async function pollChainedVideoImageStage(params: {
  activeTaskId: string;
  larp: any;
  locale: AppLocale;
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
}): Promise<ImageGenerationPollResult> {
  const { activeTaskId, larp, locale, supabaseAdmin } = params;
  const metadata = getGenerationMetadata(larp);

  if (activeTaskId.startsWith("custom_")) {
    const jobId = activeTaskId.replace("custom_", "");
    let customStatus: any;
    try {
      customStatus = await getOneshotJobStatus(jobId);
    } catch (err) {
      logger.error({ err }, "Failed to poll OneshotAPI for chained video image");
      customStatus = {
        status: "failed",
        error: isGoogleAiPromptFlagged(err)
          ? err instanceof Error
            ? err.message
            : String(err)
          : tBackend(locale, "larps.pollingError"),
      };
    }

    const currentSettings = await getAppSettings();
    const ageInMs = Date.now() - new Date(larp.created_at).getTime();
    const isTimeout = ageInMs > currentSettings.fallbackTimeoutMs;
    const isCustomApiFailed =
      customStatus.status === "failed" || customStatus.status === "fail";
    const isPolicyViolation =
      isCustomApiFailed && isGoogleAiPromptFlagged(customStatus);

    if (customStatus.status === "completed" || customStatus.status === "success") {
      return {
        status: "success",
        resultJson: JSON.stringify(customStatus),
        failMsg: null,
        costTime: null,
      };
    }

    if (!isCustomApiFailed && !isTimeout) {
      return {
        status: "waiting",
        resultJson: null,
        failMsg: null,
        costTime: null,
      };
    }

    if (isPolicyViolation) {
      logger.warn(
        { larpId: larp.id, jobId },
        "OneshotAPI rejected chained video image prompt, skipping Kie AI fallback",
      );
      return {
        status: "fail",
        resultJson: null,
        failMsg: tBackend(locale, "larps.policyViolation"),
        costTime: null,
      };
    }

    try {
      const aspectRatio = larp.aspect_ratio || OUTPUT_ASPECT_RATIO;
      const imageUrls = Array.isArray(larp.input_assets)
        ? larp.input_assets.filter((url: unknown): url is string => typeof url === "string")
        : [];
      const fallbackKieResponse = await createKieTask({
        prompt: larp.final_prompt,
        aspect_ratio: aspectRatio,
        ...(imageUrls.length > 0 ? { image_input: imageUrls } : {}),
      });

      if (fallbackKieResponse.code === 200 && fallbackKieResponse.data?.taskId) {
        const newKieTaskIdString = `${larp.provider_task_id},${fallbackKieResponse.data.taskId}`;
        await supabaseAdmin
          .from("generations")
          .update({
            provider_task_id: newKieTaskIdString,
            metadata: {
              ...metadata,
              imageProvider: "kie",
              imageFallbackFrom: activeTaskId,
              imageTaskId: fallbackKieResponse.data.taskId,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", larp.id);

        return {
          status: "waiting",
          resultJson: null,
          failMsg: null,
          costTime: null,
          providerTaskUpdated: true,
        };
      }

      return {
        status: "fail",
        resultJson: null,
        failMsg: tBackend(locale, "larps.fallbackFailed"),
        costTime: null,
      };
    } catch (fallbackErr) {
      logger.error({ err: fallbackErr }, "Kie fallback failed for chained video image");
      return {
        status: "fail",
        resultJson: null,
        failMsg: tBackend(locale, "larps.fallbackFailed"),
        costTime: null,
      };
    }
  }

  try {
    const kieStatus = await getKieTaskStatus(activeTaskId);
    return {
      status: kieStatus.data.state,
      resultJson: kieStatus.data.resultJson,
      failMsg: kieStatus.data.failMsg,
      costTime: kieStatus.data.costTime,
    };
  } catch (err) {
    logger.error({ err }, "Failed to poll Kie.ai for chained video image");
    return {
      status: "fail",
      resultJson: null,
      failMsg: tBackend(locale, "larps.pollingError"),
      costTime: null,
    };
  }
}

function parseTemplateReferenceAggregates(row: {
  template_reference_images?: unknown;
  reference_image_count?: number;
}) {
  const embedded = row.template_reference_images;
  if (Array.isArray(embedded) && embedded.length > 0) {
    if (embedded[0] && typeof embedded[0] === "object" && "count" in embedded[0]) {
      const count = Number((embedded[0] as { count: number }).count);
      return {
        reference_image_count: count,
        has_face_optional_reference_image: false,
        requires_face_capture: count === 0,
      };
    }
    const refs = embedded as { requires_face_asset?: boolean }[];
    const count = refs.length;
    const hasOptional = refs.some((ref) => ref.requires_face_asset === false);
    return {
      reference_image_count: count,
      has_face_optional_reference_image: hasOptional,
      requires_face_capture: count === 0 || !hasOptional,
    };
  }
  if (typeof row.reference_image_count === "number") {
    const count = row.reference_image_count;
    return {
      reference_image_count: count,
      has_face_optional_reference_image: false,
      requires_face_capture: count === 0,
    };
  }
  return {
    reference_image_count: 0,
    has_face_optional_reference_image: false,
    requires_face_capture: true,
  };
}

const TEMPLATE_LIST_SELECT =
  "*, template_categories(slug, name, name_en), template_reference_images(requires_face_asset)";

function toTemplateDto(row: any) {
  const inputSchema = row.input_schema || {};
  const categorySlug =
    row.template_categories?.slug ||
    row.category_slug ||
    row.category ||
    null;
  const categoryName = row.template_categories?.name ?? null;
  const categoryNameEn = row.template_categories?.name_en ?? null;
  const { template_reference_images: _refEmbed, ...rest } = row;
  const refAggregates = parseTemplateReferenceAggregates(row);

  return {
    ...rest,
    category: categorySlug,
    categoryName,
    categoryNameEn,
    ...refAggregates,
    video_prompt_text:
      typeof inputSchema.video_prompt_text === "string" &&
      inputSchema.video_prompt_text.trim()
        ? inputSchema.video_prompt_text
        : null,
    keywords: Array.isArray(row.keywords) ? row.keywords.join(", ") : null,
  };
}

function toReferenceImageDto(row: {
  id: string;
  url: string;
  image_prompt: string;
  video_prompt: string | null;
  display_order: number;
  requires_face_asset: boolean;
}) {
  return {
    id: row.id,
    url: row.url,
    image_prompt: row.image_prompt,
    video_prompt: row.video_prompt,
    display_order: row.display_order,
    requires_face_asset: row.requires_face_asset,
  };
}

type TemplateReferencePickRow = {
  id: string;
  url: string;
  image_prompt: string;
  video_prompt: string | null;
  requires_face_asset: boolean;
};

async function userHasCompleteFaceAsset(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
): Promise<boolean> {
  const faceUrls = await resolveUserFaceCaptureImageUrls(supabaseAdmin, userId);
  return !!(faceUrls && faceUrls.length > 0);
}

function resolveHasFaceAssetForTemplateGeneration(
  hasCompleteFaceAsset: boolean,
  useFaceAsset?: boolean,
): boolean {
  if (useFaceAsset === false) return false;
  return hasCompleteFaceAsset;
}

function referenceRowRequiresFace(
  row: TemplateReferencePickRow | null,
): boolean {
  if (!row) return true;
  return row.requires_face_asset !== false;
}

async function respondIfTemplateReferenceImageMissing(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  templateId: string,
  selectedReferenceRow: TemplateReferencePickRow | null,
  locale: AppLocale,
  res: import("express").Response,
): Promise<boolean> {
  if (selectedReferenceRow) return true;

  const { count, error } = await supabaseAdmin
    .from("template_reference_images")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId);
  if (error) throw error;
  if ((count ?? 0) === 0) {
    res.status(422).json({
      code: "REFERENCE_IMAGE_REQUIRED",
      message: tBackend(locale, "larps.referenceImageRequired"),
    });
    return false;
  }
  return true;
}

async function respondIfTemplateFaceCaptureRequired(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  templateId: string,
  selectedReferenceRow: TemplateReferencePickRow | null,
  hasFaceAsset: boolean,
  res: import("express").Response,
): Promise<boolean> {
  if (hasFaceAsset) return true;

  if (selectedReferenceRow && !selectedReferenceRow.requires_face_asset) {
    return true;
  }

  if (!selectedReferenceRow) {
    const { count, error } = await supabaseAdmin
      .from("template_reference_images")
      .select("id", { count: "exact", head: true })
      .eq("template_id", templateId);
    if (error) throw error;
    if ((count ?? 0) > 0) {
      res.status(422).json({
        code: "FACE_CAPTURE_REQUIRED",
        message:
          "Photos visage requises (face + profils). Scanne ton visage avant de générer.",
      });
      return false;
    }
  }

  res.status(422).json({
    code: "FACE_CAPTURE_REQUIRED",
    message:
      "Photos visage requises (face + profils). Scanne ton visage avant de générer.",
  });
  return false;
}

async function appendDirectGenerationFaceAssetUrls(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  imageUrls: string[],
  useFaceAsset: boolean | undefined,
  locale: AppLocale,
  res: import("express").Response,
): Promise<string[] | null> {
  const hasCompleteFaceAsset = await userHasCompleteFaceAsset(
    supabaseAdmin,
    userId,
  );
  const includeFace = resolveHasFaceAssetForTemplateGeneration(
    hasCompleteFaceAsset,
    useFaceAsset,
  );

  if (!includeFace) {
    if (useFaceAsset === true && !hasCompleteFaceAsset) {
      res.status(422).json({
        code: "FACE_CAPTURE_REQUIRED",
        message:
          "Photos visage requises (face + profils). Scanne ton visage avant de générer.",
      });
      return null;
    }
    return imageUrls;
  }

  const faceUrls = await resolveUserFaceCaptureImageUrls(
    supabaseAdmin,
    userId,
  );
  if (!faceUrls?.length) {
    res.status(422).json({
      code: "FACE_CAPTURE_REQUIRED",
      message:
        "Photos visage requises (face + profils). Scanne ton visage avant de générer.",
    });
    return null;
  }

  return [...faceUrls, ...imageUrls];
}

async function buildTemplateGenerationImageUrls(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  selectedReferenceRow: TemplateReferencePickRow | null,
): Promise<string[]> {
  const imageUrls: string[] = [];
  if (referenceRowRequiresFace(selectedReferenceRow)) {
    const faceUrls = await resolveUserFaceCaptureImageUrls(
      supabaseAdmin,
      userId,
    );
    if (faceUrls?.length) {
      imageUrls.push(...faceUrls);
    }
  }
  if (selectedReferenceRow?.url) {
    imageUrls.push(selectedReferenceRow.url);
  }
  return imageUrls;
}

function injectTextValues(prompt: string, textValues?: string[]): string {
  let result = prompt;
  if (!textValues?.length) return result;
  textValues.forEach((value, idx) => {
    result = result.replaceAll(`{text${idx + 1}}`, value);
  });
  return result;
}

async function pickRandomReferenceRow(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  templateId: string,
  options: { hasFaceAsset: boolean },
): Promise<TemplateReferencePickRow | null> {
  const { data, error } = await supabaseAdmin
    .from("template_reference_images")
    .select("id, url, image_prompt, video_prompt, requires_face_asset")
    .eq("template_id", templateId);

  if (error) throw error;
  if (!data?.length) return null;

  const pool = options.hasFaceAsset
    ? data
    : data.filter((row) => row.requires_face_asset === false);

  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)] as TemplateReferencePickRow;
}

async function uploadTemplateReferenceImageFromDataUrl(
  templateId: string,
  dataUrl: string,
): Promise<string | null> {
  const match = dataUrl.match(/^data:(image\/[\w+.-]+);base64,([\s\S]+)$/);
  if (!match) {
    logger.warn(
      { prefix: dataUrl.substring(0, 40) },
      "Invalid template reference image, skipping",
    );
    return null;
  }

  const contentType = match[1];
  const base64Data = match[2];
  if (!TEMPLATE_REFERENCE_IMAGE_TYPES.has(contentType)) {
    logger.warn({ contentType }, "Unsupported template reference image type, skipping");
    return null;
  }

  const buffer = Buffer.from(base64Data, "base64");
  if (
    buffer.length === 0 ||
    buffer.length > MAX_TEMPLATE_REFERENCE_IMAGE_BYTES
  ) {
    logger.warn(
      { byteSize: buffer.length },
      "Template reference image size is invalid, skipping",
    );
    return null;
  }

  const ext = contentType.split("/")[1] || "jpg";
  const key = `templates/${templateId}/references/${randomUUID()}.${ext}`;
  return uploadToR2(key, buffer, contentType);
}

function toLarpDto(row: any) {
  const template = row.templates;
  const category =
    template?.template_categories?.slug ||
    template?.category_slug ||
    template?.category ||
    null;

  return {
    id: row.id,
    userId: row.user_id,
    templateId: row.template_id,
    generationType: row.generation_type,
    finalPrompt: row.final_prompt,
    providerTaskId: row.provider_task_id,
    status: toClientGenerationStatus(row.status),
    outputAssets: toAssetList(row.output_assets),
    watermarkedAssets: toAssetList(row.watermarked_assets),
    inputAssets: toAssetList(row.input_assets),
    failMessage: row.fail_message,
    costTime: toNullableNumber(row.cost_time),
    aspectRatio: row.aspect_ratio,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    template: template
      ? {
          name: template.name,
          nameEn: template.name_en ?? null,
          category,
        }
      : null,
  };
}

function toAdminGenerationLogDto(row: any) {
  const template = row.templates;
  const category =
    template?.template_categories?.slug ||
    template?.category_slug ||
    template?.category ||
    null;
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

  return {
    id: row.id,
    userId: row.user_id,
    userEmail: profile?.email ?? null,
    generationType: row.generation_type,
    status: toClientGenerationStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    costTime: toNullableNumber(row.cost_time),
    failMessage: row.fail_message,
    template: template
      ? {
          name: template.name,
          nameEn: template.name_en ?? null,
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

  if (Object.prototype.hasOwnProperty.call(body, "video_prompt_text")) {
    next.video_prompt_text =
      typeof body.video_prompt_text === "string"
        ? body.video_prompt_text.trim()
        : "";
  }

  return next;
}

function getTemplateVideoPrompt(inputSchema: unknown): string | null {
  if (typeof inputSchema !== "object" || inputSchema === null) return null;
  const videoPrompt = (inputSchema as Record<string, unknown>).video_prompt_text;
  if (typeof videoPrompt !== "string") return null;
  const trimmed = videoPrompt.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function buildTemplatePayload(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  body: any,
  currentInputSchema?: any,
) {
  const payload: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(body, "name")) payload.name = body.name;
  if (Object.prototype.hasOwnProperty.call(body, "name_en")) {
    payload.name_en = body.name_en || null;
  }
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
    Object.prototype.hasOwnProperty.call(body, "video_prompt_text")
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

function getBillableCreditCost(
  limitResult: { isAdmin: boolean },
  creditCost: number,
): number {
  return limitResult.isAdmin ? 0 : creditCost;
}

async function deductGenerationCredits(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  params: {
    userId: string;
    generationId: string;
    creditCost: number;
    source: string;
    metadata?: Record<string, unknown>;
  },
) {
  if (params.creditCost < 0) {
    throw new Error("creditCost must be non-negative");
  }

  if (params.creditCost === 0) {
    return null;
  }

  const { error } = await applyCreditDelta(supabaseAdmin, {
    userId: params.userId,
    delta: -params.creditCost,
    reason: "generation_charge",
    generationId: params.generationId,
    idempotencyKey: `generation:${params.generationId}:charge`,
    metadata: {
      source: params.source,
      ...params.metadata,
    },
  });

  return error;
}

async function refundGenerationCreditsIfCharged(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  params: {
    userId: string;
    generationId: string;
    source: string;
    failMessage?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { data: charges, error: chargeFetchErr } = await supabaseAdmin
    .from("credit_ledger")
    .select("delta")
    .eq("generation_id", params.generationId)
    .eq("reason", "generation_charge");

  if (chargeFetchErr) {
    throw chargeFetchErr;
  }

  const refundAmount = (charges ?? []).reduce((total, entry) => {
    const delta = Number(entry.delta);
    return delta < 0 ? total + Math.abs(delta) : total;
  }, 0);

  if (refundAmount === 0) {
    return null;
  }

  const { error } = await applyCreditDelta(supabaseAdmin, {
    userId: params.userId,
    delta: refundAmount,
    reason: "refund",
    generationId: params.generationId,
    idempotencyKey: `generation:${params.generationId}:refund`,
    metadata: {
      source: params.source,
      fail_message: params.failMessage ?? null,
      ...params.metadata,
    },
  });

  return error;
}

async function markCreditDeductionFailed(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  generationId: string,
) {
  await supabaseAdmin
    .from("generations")
    .update({
      status: "failed",
      fail_message: "credit_deduction_failed",
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq("id", generationId);
}

const LANDING_MARQUEE_AVIF_PREFIX = "landing/marquee/avif/";
const LANDING_MARQUEE_WEBP_PREFIX = "landing/marquee/webp/";
const LANDING_MARQUEE_CACHE_MS = 5 * 60 * 1000;

type LandingMarqueeImage = {
  id: string;
  alt: string;
  avif_url: string;
  webp_url: string | null;
};

let landingMarqueeCache:
  | { expiresAt: number; images: LandingMarqueeImage[] }
  | null = null;

function objectIdFromPrefix(key: string, prefix: string): string | null {
  if (!key.startsWith(prefix)) return null;
  const fileName = key.slice(prefix.length).replace(/^\/+/, "");
  const id = fileName.replace(/\.(avif|webp)$/i, "");
  return id && !id.includes("/") ? id : null;
}

async function listLandingMarqueeImages(): Promise<LandingMarqueeImage[]> {
  const now = Date.now();
  if (landingMarqueeCache && landingMarqueeCache.expiresAt > now) {
    return landingMarqueeCache.images;
  }

  const [avifObjects, webpObjects] = await Promise.all([
    listPublicR2Objects(LANDING_MARQUEE_AVIF_PREFIX),
    listPublicR2Objects(LANDING_MARQUEE_WEBP_PREFIX),
  ]);

  const avifById = new Map<string, string>();
  const webpById = new Map<string, string>();

  for (const object of avifObjects) {
    const id = objectIdFromPrefix(object.key, LANDING_MARQUEE_AVIF_PREFIX);
    if (id) avifById.set(id, object.publicUrl);
  }

  for (const object of webpObjects) {
    const id = objectIdFromPrefix(object.key, LANDING_MARQUEE_WEBP_PREFIX);
    if (id) webpById.set(id, object.publicUrl);
  }

  const images = Array.from(avifById.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, avifUrl], index) => ({
      id,
      alt: `LarpKing example ${index + 1}`,
      avif_url: avifUrl,
      webp_url: webpById.get(id) ?? null,
    }));

  landingMarqueeCache = {
    expiresAt: now + LANDING_MARQUEE_CACHE_MS,
    images,
  };

  return images;
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
  // LANDING ASSETS
  // =============================================

  app.get(api.landing.marquee.path, async (req, res) => {
    try {
      const images = await listLandingMarqueeImages();
      res.setHeader(
        "Cache-Control",
        "public, max-age=300, stale-while-revalidate=3600",
      );
      res.json(images);
    } catch (error: any) {
      logger.error({ err: error }, "Error listing landing marquee images");
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
    }
  });

  // =============================================
  // FACE CAPTURES
  // =============================================

  app.get(api.faceCaptures.latest.path, requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const locale = resolveLocaleFromRequest(req);
    const supabaseAdmin = getSupabaseAdmin();

    try {
      const session = await getLatestFaceCaptureSession(
        supabaseAdmin,
        authReq.userId,
      );

      if (!session) {
        return res.json({ session: null });
      }

      const assets = await getFaceCaptureAssetsForSession(
        supabaseAdmin,
        authReq.userId,
        session.id,
      );
      const assetsByPose = new Map(assets.map((asset) => [asset.pose_id, asset]));

      res.json({
        session: {
          id: session.id,
          createdAt: session.created_at,
          captures: FACE_CAPTURE_POSES.map((poseId) => {
            const asset = assetsByPose.get(poseId);
            if (!asset) return null;

            return {
              poseId,
              byteSize: asset.byte_size,
              imageUrl: `/api/face-captures/latest/assets/${poseId}`,
            };
          }).filter(Boolean),
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Error reading latest face capture");
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
    }
  });

  app.get(api.faceCaptures.asset.path, requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const locale = resolveLocaleFromRequest(req);
    const supabaseAdmin = getSupabaseAdmin();
    const poseId = req.params.poseId;

    if (!isFaceCapturePose(poseId)) {
      return res.status(404).json({ message: "Face capture not found." });
    }

    try {
      const session = await getLatestFaceCaptureSession(
        supabaseAdmin,
        authReq.userId,
      );

      if (!session) {
        return res.status(404).json({ message: "Face capture not found." });
      }

      const { data: asset, error: assetError } = await supabaseAdmin
        .from("face_capture_assets")
        .select("storage_bucket, storage_path, content_type")
        .eq("user_id", authReq.userId)
        .eq("session_id", session.id)
        .eq("pose_id", poseId)
        .maybeSingle();

      if (assetError) throw assetError;
      if (!asset) {
        return res.status(404).json({ message: "Face capture not found." });
      }

      const { data: imageBlob, error: downloadError } = await supabaseAdmin.storage
        .from(asset.storage_bucket)
        .download(asset.storage_path);

      if (downloadError) throw downloadError;

      const buffer = Buffer.from(await imageBlob.arrayBuffer());
      res.setHeader("Content-Type", asset.content_type || "image/jpeg");
      res.setHeader("Content-Length", String(buffer.length));
      res.setHeader("Cache-Control", "private, no-store");
      res.end(buffer);
    } catch (error) {
      logger.error({ err: error }, "Error serving face capture asset");
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
    }
  });

  app.delete(api.faceCaptures.deleteLatest.path, requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const locale = resolveLocaleFromRequest(req);
    const supabaseAdmin = getSupabaseAdmin();

    try {
      const { data: sessions, error: sessionsError } = await supabaseAdmin
        .from("face_capture_sessions")
        .select("id")
        .eq("user_id", authReq.userId);

      if (sessionsError) throw sessionsError;

      const sessionIds = (sessions ?? []).map((session) => session.id);
      if (sessionIds.length === 0) {
        return res.json({ deleted: false });
      }

      const deletedCount = await deleteFaceCaptureSessionsForUser(
        supabaseAdmin,
        authReq.userId,
        sessionIds,
      );
      res.json({ deleted: deletedCount > 0, deletedCount });
    } catch (error) {
      logger.error({ err: error }, "Error deleting face capture");
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
    }
  });

  app.post(
    api.faceCaptures.create.path,
    requireAuth,
    validateRequest(faceCaptureBodySchema),
    async (req, res) => {
      const authReq = req as AuthenticatedRequest;
      const locale = resolveLocaleFromRequest(req);
      const supabaseAdmin = getSupabaseAdmin();
      const sessionId = randomUUID();
      const uploadedPaths: string[] = [];
      let sessionInserted = false;

      try {
        const body = req.body as z.infer<typeof faceCaptureBodySchema>;
        const poseIds = body.captures.map((capture) => capture.poseId);
        const hasExpectedPoseOrder = FACE_CAPTURE_POSES.every(
          (poseId, index) => poseIds[index] === poseId,
        );

        if (!hasExpectedPoseOrder) {
          return res.status(400).json({
            message: "Expected frontal, profile-right, and profile-left captures.",
          });
        }

        const decodedCaptures = body.captures.map((capture) => ({
          ...capture,
          buffer: decodeJpegBase64(capture.imageBase64),
        }));

        for (const capture of decodedCaptures) {
          const storagePath = `users/${authReq.userId}/sessions/${sessionId}/${capture.poseId}.jpg`;
          const { error: uploadError } = await supabaseAdmin.storage
            .from(FACE_CAPTURE_BUCKET)
            .upload(storagePath, capture.buffer, {
              contentType: "image/jpeg",
              upsert: false,
            });

          if (uploadError) throw uploadError;
          uploadedPaths.push(storagePath);
        }

        const { error: sessionError } = await supabaseAdmin
          .from("face_capture_sessions")
          .insert({
            id: sessionId,
            user_id: authReq.userId,
            status: "completed",
            metadata: {
              source: "larpking_web",
              pose_count: decodedCaptures.length,
            },
          });

        if (sessionError) throw sessionError;
        sessionInserted = true;

        const { error: assetsError } = await supabaseAdmin
          .from("face_capture_assets")
          .insert(
            decodedCaptures.map((capture) => ({
              session_id: sessionId,
              user_id: authReq.userId,
              pose_id: capture.poseId,
              storage_bucket: FACE_CAPTURE_BUCKET,
              storage_path: `users/${authReq.userId}/sessions/${sessionId}/${capture.poseId}.jpg`,
              content_type: "image/jpeg",
              byte_size: capture.buffer.length,
              metadata: {
                timestamp: capture.timestamp,
                landmarks: capture.landmarks,
                landmarkFrameWidth: capture.landmarkFrameWidth ?? null,
                landmarkFrameHeight: capture.landmarkFrameHeight ?? null,
              },
            })),
          );

        if (assetsError) throw assetsError;

        const { data: previousSessions, error: previousSessionsError } =
          await supabaseAdmin
            .from("face_capture_sessions")
            .select("id")
            .eq("user_id", authReq.userId)
            .neq("id", sessionId);

        if (previousSessionsError) {
          logger.warn(
            { err: previousSessionsError, userId: authReq.userId },
            "Unable to list previous face capture sessions for cleanup",
          );
        } else {
          const previousSessionIds = (previousSessions ?? []).map(
            (previousSession) => previousSession.id,
          );

          if (previousSessionIds.length > 0) {
            await deleteFaceCaptureSessionsForUser(
              supabaseAdmin,
              authReq.userId,
              previousSessionIds,
            ).catch((cleanupError) => {
              logger.warn(
                { err: cleanupError, sessionIds: previousSessionIds },
                "Unable to cleanup previous face capture sessions",
              );
            });
          }
        }

        res.status(201).json({
          sessionId,
          captures: decodedCaptures.map((capture) => ({
            poseId: capture.poseId,
            byteSize: capture.buffer.length,
          })),
        });
      } catch (error: any) {
        if (uploadedPaths.length > 0) {
          await supabaseAdmin.storage
            .from(FACE_CAPTURE_BUCKET)
            .remove(uploadedPaths)
            .catch(() => undefined);
        }
        if (sessionInserted) {
          try {
            await supabaseAdmin
              .from("face_capture_sessions")
              .delete()
              .eq("id", sessionId);
          } catch {
            // Best-effort cleanup only.
          }
        }

        logger.error({ err: error }, "Error storing face captures");
        if (error?.message === "invalid_face_capture_image") {
          return res.status(400).json({ message: "Invalid face capture image." });
        }

        res
          .status(500)
          .json({ message: tBackend(locale, "common.internalServerError") });
      }
    },
  );

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
        .select("name, name_en, example_before_url, example_after_url")
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
        .select(
          TEMPLATE_LIST_SELECT,
        )
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
        .select(
          TEMPLATE_LIST_SELECT,
        )
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
          .select(
            TEMPLATE_LIST_SELECT,
          )
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
          .select(
            TEMPLATE_LIST_SELECT,
          )
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

  const templateIllustrationVideoTypes: Record<string, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };

  app.post(
    api.templates.uploadImage.path,
    requireAuth,
    requireAdmin,
    validateRequest(uploadImageSchema),
    async (req, res) => {
      try {
        const { field, image } = req.body;
        const templateId = req.params.id;

        const match = image.match(
          /^data:(image\/[\w.+-]+|video\/[\w.+-]+);base64,(.+)$/,
        );
        if (!match) {
          return res.status(400).json({ message: "Format de fichier invalide" });
        }

        const contentType = match[1];
        const isVideo = contentType.startsWith("video/");
        if (isVideo && field !== "example_after_url") {
          return res
            .status(400)
            .json({ message: "Seul le champ « après » accepte une vidéo" });
        }

        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, "base64");
        const ext = isVideo
          ? (templateIllustrationVideoTypes[contentType] ?? "mp4")
          : (contentType.split("/")[1] || "jpg").replace("jpeg", "jpg");
        const key = `templates/${templateId}/${field}.${ext}`;

        const { uploadToR2 } = await import("./lib/r2-client");
        const publicUrl = await uploadToR2(key, buffer, contentType);

        const supabaseAdmin = getSupabaseAdmin();
        const { data, error } = await supabaseAdmin
          .from("templates")
          .update({ [field]: publicUrl, updated_at: new Date().toISOString() })
          .eq("id", templateId)
          .select(
            TEMPLATE_LIST_SELECT,
          )
          .single();

        if (error) throw error;
        res.json(toTemplateDto(data));
      } catch (error: any) {
        logger.error({ err: error }, "Error uploading template image");
        res.status(500).json({ message: error.message });
      }
    },
  );

  const uploadReferenceImagesSchema = z.object({
    items: z.array(uploadReferenceImageItemSchema).min(1).max(20),
  });

  async function assertTemplateExists(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    templateId: string,
  ) {
    const { data, error } = await supabaseAdmin
      .from("templates")
      .select("id")
      .eq("id", templateId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // GET /api/templates/:id/reference-images (Admin only)
  app.get(
    api.templates.referenceImages.list.path,
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const templateId = req.params.id;
        const supabaseAdmin = getSupabaseAdmin();
        const template = await assertTemplateExists(supabaseAdmin, templateId);
        if (!template) {
          return res.status(404).json({ message: "Template introuvable" });
        }

        const { data, error } = await supabaseAdmin
          .from("template_reference_images")
          .select(
            "id, url, image_prompt, video_prompt, display_order, requires_face_asset",
          )
          .eq("template_id", templateId)
          .order("display_order", { ascending: true });

        if (error) throw error;
        res.json((data ?? []).map(toReferenceImageDto));
      } catch (error: any) {
        logger.error({ err: error }, "Error listing template reference images");
        res.status(500).json({ message: error.message });
      }
    },
  );

  // POST /api/templates/:id/reference-images (Admin only)
  app.post(
    api.templates.referenceImages.create.path,
    requireAuth,
    requireAdmin,
    validateRequest(uploadReferenceImagesSchema),
    async (req, res) => {
      try {
        const templateId = req.params.id;
        const { items } = req.body as {
          items: {
            image: string;
            image_prompt: string;
            video_prompt?: string | null;
            requires_face_asset?: boolean;
          }[];
        };
        const supabaseAdmin = getSupabaseAdmin();
        const template = await assertTemplateExists(supabaseAdmin, templateId);
        if (!template) {
          return res.status(404).json({ message: "Template introuvable" });
        }

        const { count: existingCount, error: countError } = await supabaseAdmin
          .from("template_reference_images")
          .select("id", { count: "exact", head: true })
          .eq("template_id", templateId);
        if (countError) throw countError;

        const rowsToInsert: {
          template_id: string;
          url: string;
          image_prompt: string;
          video_prompt: string | null;
          display_order: number;
          requires_face_asset: boolean;
        }[] = [];
        let displayOrder = existingCount ?? 0;

        for (const item of items) {
          const url = await uploadTemplateReferenceImageFromDataUrl(
            templateId,
            item.image,
          );
          if (!url) continue;
          rowsToInsert.push({
            template_id: templateId,
            url,
            image_prompt: item.image_prompt.trim(),
            video_prompt:
              typeof item.video_prompt === "string" &&
              item.video_prompt.trim()
                ? item.video_prompt.trim()
                : null,
            display_order: displayOrder++,
            requires_face_asset: item.requires_face_asset !== false,
          });
        }

        if (rowsToInsert.length === 0) {
          return res.status(400).json({ message: "Aucune image valide" });
        }

        const { data, error } = await supabaseAdmin
          .from("template_reference_images")
          .insert(rowsToInsert)
          .select(
            "id, url, image_prompt, video_prompt, display_order, requires_face_asset",
          );

        if (error) throw error;
        res.status(201).json((data ?? []).map(toReferenceImageDto));
      } catch (error: any) {
        logger.error({ err: error }, "Error uploading template reference images");
        res.status(500).json({ message: error.message });
      }
    },
  );

  // PATCH /api/templates/:id/reference-images/:refId (Admin only)
  app.patch(
    api.templates.referenceImages.update.path,
    requireAuth,
    requireAdmin,
    validateRequest(updateReferenceImageSchema),
    async (req, res) => {
      try {
        const { id: templateId, refId } = req.params;
        const supabaseAdmin = getSupabaseAdmin();
        const updates: Record<string, string | boolean | null> = {};

        if (Object.prototype.hasOwnProperty.call(req.body, "image_prompt")) {
          updates.image_prompt = req.body.image_prompt.trim();
        }
        if (Object.prototype.hasOwnProperty.call(req.body, "video_prompt")) {
          const vp = req.body.video_prompt;
          updates.video_prompt =
            typeof vp === "string" && vp.trim() ? vp.trim() : null;
        }
        if (
          Object.prototype.hasOwnProperty.call(req.body, "requires_face_asset")
        ) {
          updates.requires_face_asset = req.body.requires_face_asset === true;
        }

        if (Object.keys(updates).length === 0) {
          return res.status(400).json({ message: "Aucune modification" });
        }

        const { data, error } = await supabaseAdmin
          .from("template_reference_images")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", refId)
          .eq("template_id", templateId)
          .select(
            "id, url, image_prompt, video_prompt, display_order, requires_face_asset",
          )
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          return res.status(404).json({ message: "Image de référence introuvable" });
        }
        res.json(toReferenceImageDto(data));
      } catch (error: any) {
        logger.error({ err: error }, "Error updating template reference image");
        res.status(500).json({ message: error.message });
      }
    },
  );

  // DELETE /api/templates/:id/reference-images/:refId (Admin only)
  app.delete(
    api.templates.referenceImages.delete.path,
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const { id: templateId, refId } = req.params;
        const supabaseAdmin = getSupabaseAdmin();

        const { error } = await supabaseAdmin
          .from("template_reference_images")
          .delete()
          .eq("id", refId)
          .eq("template_id", templateId);

        if (error) throw error;
        res.status(204).send();
      } catch (error: any) {
        logger.error({ err: error }, "Error deleting template reference image");
        res.status(500).json({ message: error.message });
      }
    },
  );

  // =============================================
  // LARP GENERATION ENDPOINTS
  // =============================================

  const generateLarpBodySchema = z.object({
    template_id: z.string().uuid(),
    placeholders: z.record(z.string()).optional(),
    aspect_ratio: z.string().optional().default(OUTPUT_ASPECT_RATIO),
  });

  // POST /api/larps/generate
  app.post(
    api.larps.generate.path,
    requireAuth,
    generateLimiter,
    validateRequest(generateLarpBodySchema),
    async (req, res) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const { template_id, placeholders } = req.body;
        const aspect_ratio = OUTPUT_ASPECT_RATIO;
        const supabaseAdmin = getSupabaseAdmin();
        const locale = resolveLocaleFromRequest(req);

        // 0. Check generation limits & credits
        const limitResult = await checkGenerationLimits(authReq.userId, locale);
        if (!limitResult.allowed) {
          return res.status(403).json({ message: limitResult.reason });
        }
        const creditCost = getBillableCreditCost(
          limitResult,
          IMAGE_CREDIT_COST,
        );

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
              aspectRatio: OUTPUT_ASPECT_RATIO,
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
                message: tBackend(locale, "larps.policyViolation"),
              });
            }

            logger.error({ err }, "OneshotAPI failed, falling back to Kie AI");
            provider = "kie";
            const kieResponse = await createKieTask({
              prompt: finalPrompt,
              aspect_ratio: OUTPUT_ASPECT_RATIO,
            });
            if (kieResponse.code !== 200 || !kieResponse.data?.taskId) {
              logger.error({ response: kieResponse }, "Kie.ai createTask unexpected response");
              return res
                .status(502)
                .json({ message: tBackend(locale, "larps.taskCreateFailed") });
            }
            externalTaskId = kieResponse.data.taskId;
          }
        } else {
          provider = "kie";
          const kieResponse = await createKieTask({
            prompt: finalPrompt,
            aspect_ratio: OUTPUT_ASPECT_RATIO,
          });
          if (kieResponse.code !== 200 || !kieResponse.data?.taskId) {
            logger.error({ response: kieResponse }, "Kie.ai createTask unexpected response");
            return res
              .status(502)
              .json({ message: tBackend(locale, "larps.taskCreateFailed") });
          }
          externalTaskId = kieResponse.data.taskId;
        }

        // 4. Store in generations, then charge through the credit ledger.
        const { data: larp, error: insertErr } = await supabaseAdmin
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
            credit_cost: creditCost,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        const deductErr = await deductGenerationCredits(supabaseAdmin, {
          userId: authReq.userId,
          creditCost,
          generationId: larp.id,
          source: "template_generation",
          metadata: {
            provider,
            provider_task_id: externalTaskId,
          },
        });

        if (deductErr) {
          await markCreditDeductionFailed(supabaseAdmin, larp.id);
          logger.error({ err: deductErr }, "Failed to deduct credits");
          return res
            .status(500)
            .json({ message: tBackend(locale, "larps.creditDeductionFailed") });
        }

        // Record generation for limit tracking
        await recordGeneration(authReq.userId);

        res.status(201).json({
          id: larp.id,
          taskId: externalTaskId,
          status: "waiting",
          isSubscriber: limitResult.isSubscriber,
        });
      } catch (error: any) {
        logger.error({ err: error }, "Error generating larp");
        const locale = resolveLocaleFromRequest(req);
        res
          .status(500)
          .json({ message: tBackend(locale, "common.internalServerError") });
      }
    },
  );

  // POST /api/larps/generate-direct (free prompt, no template)
  const generateDirectBodySchema = z.object({
    prompt: z.string().min(1).max(2000),
    aspect_ratio: z.string().optional().default(OUTPUT_ASPECT_RATIO),
    images: z.array(z.string()).optional().default([]),
    template_id: z.string().uuid().optional(),
    text_values: z.array(z.string().max(500)).optional(),
    use_face_asset: z.boolean().optional(),
  });

  app.post(
    api.larps.generateDirect.path,
    requireAuth,
    generateLimiter,
    validateRequest(generateDirectBodySchema),
    async (req, res) => {
      try {
        const authReq = req as AuthenticatedRequest;
        let { prompt, images, template_id, use_face_asset } = req.body;
        const aspect_ratio = OUTPUT_ASPECT_RATIO;
        const locale = resolveLocaleFromRequest(req);

        const supabaseAdmin = getSupabaseAdmin();

        // 0. Check generation limits & credits
        const limitResult = await checkGenerationLimits(authReq.userId, locale);
        if (!limitResult.allowed) {
          return res.status(403).json({ message: limitResult.reason });
        }
        const creditCost = getBillableCreditCost(
          limitResult,
          IMAGE_CREDIT_COST,
        );

        if (!template_id && (!images || images.length === 0)) {
          return res.status(422).json({
            code: "REFERENCE_IMAGE_REQUIRED",
            message: tBackend(locale, "larps.referenceImageRequired"),
          });
        }

        let selectedReferenceRow: Awaited<
          ReturnType<typeof pickRandomReferenceRow>
        > = null;
        let finalPrompt = prompt;

        if (template_id) {
          const { data: template, error: templateError } = await supabaseAdmin
            .from("templates")
            .select("id, prompt_text")
            .eq("id", template_id)
            .eq("is_active", true)
            .maybeSingle();

          if (templateError) throw templateError;
          if (!template) {
            return res
              .status(404)
              .json({ message: tBackend(locale, "templates.notFoundOrInactive") });
          }

          const hasCompleteFaceAsset = await userHasCompleteFaceAsset(
            supabaseAdmin,
            authReq.userId,
          );
          const hasFaceAsset = resolveHasFaceAssetForTemplateGeneration(
            hasCompleteFaceAsset,
            use_face_asset,
          );
          selectedReferenceRow = await pickRandomReferenceRow(
            supabaseAdmin,
            template_id,
            { hasFaceAsset },
          );
          finalPrompt = selectedReferenceRow
            ? selectedReferenceRow.image_prompt
            : template.prompt_text;

          const refOk = await respondIfTemplateReferenceImageMissing(
            supabaseAdmin,
            template_id,
            selectedReferenceRow,
            locale,
            res,
          );
          if (!refOk) return;

          const faceOk = await respondIfTemplateFaceCaptureRequired(
            supabaseAdmin,
            template_id,
            selectedReferenceRow,
            hasFaceAsset,
            res,
          );
          if (!faceOk) return;
        }

        // Apply global mapping for "Tana" and "92i"
        finalPrompt = finalPrompt.replace(/tanas?|92i/gi, "jolies filles");

        let imageUrls: string[] = [];
        if (template_id) {
          imageUrls = await buildTemplateGenerationImageUrls(
            supabaseAdmin,
            authReq.userId,
            selectedReferenceRow,
          );
        } else if (images && images.length > 0) {
          imageUrls = await uploadInputImagesToR2(authReq.userId, images);
          const mergedUrls = await appendDirectGenerationFaceAssetUrls(
            supabaseAdmin,
            authReq.userId,
            imageUrls,
            use_face_asset,
            locale,
            res,
          );
          if (mergedUrls === null) return;
          imageUrls = mergedUrls;
        }

        if (
          (template_id && !selectedReferenceRow?.url) ||
          (!template_id && imageUrls.length === 0)
        ) {
          return res.status(422).json({
            code: "REFERENCE_IMAGE_REQUIRED",
            message: tBackend(locale, "larps.referenceImageRequired"),
          });
        }

        const referenceMetadata = selectedReferenceRow
          ? {
              selectedTemplateReferenceImage: selectedReferenceRow.url,
              selectedTemplateReferenceImageId: selectedReferenceRow.id,
            }
          : {};

        // 3. Call Image API
        const oneshotConfig = getOneshotApiConfig();
        const appSettings = await getAppSettings();
        let externalTaskId: string;
        let provider: "oneshot" | "kie" = "oneshot";

        if (!appSettings.forceKieAi && oneshotConfig.url && oneshotConfig.key) {
          try {
            // Upload images to OneshotAPI servers if any
            const referenceFileIds = imageUrls.length > 0
              ? await uploadImageUrlsToOneshot(imageUrls)
              : [];

            logger.info({ imageCount: imageUrls.length, referenceFileIds }, "Calling OneshotAPI");
            const oneshotResponse = await createOneshotJob(finalPrompt, {
              aspectRatio: OUTPUT_ASPECT_RATIO,
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
                message: tBackend(locale, "larps.policyViolation"),
              });
            }

            logger.error({ err }, "OneshotAPI failed, falling back to Kie AI");
            provider = "kie";
            const kieResponse = await createKieTask({
              prompt: finalPrompt,
              aspect_ratio: OUTPUT_ASPECT_RATIO,
              ...(imageUrls.length > 0 ? { image_input: imageUrls } : {}),
            });
            if (kieResponse.code !== 200 || !kieResponse.data?.taskId) {
              logger.error({ response: kieResponse }, "Kie.ai createTask unexpected response");
              return res
                .status(502)
                .json({ message: tBackend(locale, "larps.taskCreateFailed") });
            }
            externalTaskId = kieResponse.data.taskId;
          }
        } else {
          provider = "kie";
          logger.info({ imageCount: imageUrls.length, imageUrls }, "Calling Kie.ai with images");
          const kieResponse = await createKieTask({
            prompt: finalPrompt,
            aspect_ratio: OUTPUT_ASPECT_RATIO,
            ...(imageUrls.length > 0 ? { image_input: imageUrls } : {}),
          });

          if (kieResponse.code !== 200 || !kieResponse.data?.taskId) {
            logger.error({ response: kieResponse }, "Kie.ai createTask unexpected response");
            return res
              .status(502)
              .json({ message: tBackend(locale, "larps.taskCreateFailed") });
          }
          externalTaskId = kieResponse.data.taskId;
        }

        // 4. Store in generations, then charge through the credit ledger.
        const { data: larp, error: insertErr } = await supabaseAdmin
          .from("generations")
          .insert({
            user_id: authReq.userId,
            template_id: template_id || null,
            generation_type: "image",
            prompt: finalPrompt,
            final_prompt: finalPrompt,
            provider,
            provider_task_id: externalTaskId,
            status: "processing",
            aspect_ratio,
            input_assets: imageUrls,
            credit_cost: creditCost,
            metadata: referenceMetadata,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        const deductErr = await deductGenerationCredits(supabaseAdmin, {
          userId: authReq.userId,
          creditCost,
          generationId: larp.id,
          source: "direct_generation",
          metadata: {
            provider,
            provider_task_id: externalTaskId,
            ...referenceMetadata,
          },
        });

        if (deductErr) {
          await markCreditDeductionFailed(supabaseAdmin, larp.id);
          logger.error({ err: deductErr }, "Failed to deduct credits");
          return res
            .status(500)
            .json({ message: tBackend(locale, "larps.creditDeductionFailed") });
        }

        // Record generation for limit tracking
        await recordGeneration(authReq.userId);

        res.status(201).json({
          id: larp.id,
          taskId: externalTaskId,
          status: "waiting",
          isSubscriber: limitResult.isSubscriber,
        });
      } catch (error: any) {
        logger.error({ err: error }, "Error generating direct larp");
        const locale = resolveLocaleFromRequest(req);
        res
          .status(500)
          .json({ message: tBackend(locale, "common.internalServerError") });
      }
    },
  );

  // POST /api/larps/generate-video
  app.post(
    api.larps.generateVideo.path,
    requireAuth,
    generateLimiter,
    validateRequest(generateVideoBodySchema),
    async (req, res) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const {
          prompt,
          video_prompt,
          images,
          template_id,
          use_face_asset,
        } = req.body;
        const aspectRatio = OUTPUT_ASPECT_RATIO;
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
        const creditCost = getBillableCreditCost(
          limitResult,
          VIDEO_CREDIT_COST,
        );

        if (!template_id && (!images || images.length === 0)) {
          return res.status(422).json({
            code: "REFERENCE_IMAGE_REQUIRED",
            message: tBackend(locale, "larps.referenceImageRequired"),
          });
        }

        let templateIdForGeneration: string | null = null;
        let selectedReferenceRow: Awaited<
          ReturnType<typeof pickRandomReferenceRow>
        > = null;
        let templateVideoPrompt: string | null = null;
        let finalImagePrompt = prompt;

        if (template_id) {
          const { data: template, error: templateError } = await supabaseAdmin
            .from("templates")
            .select("id, prompt_text, input_schema")
            .eq("id", template_id)
            .eq("is_active", true)
            .in("generation_type", ["video", "both"])
            .maybeSingle();

          if (templateError) throw templateError;
          if (!template) {
            return res
              .status(404)
              .json({ message: tBackend(locale, "templates.notFoundOrInactive") });
          }

          templateIdForGeneration = template.id;
          const hasCompleteFaceAsset = await userHasCompleteFaceAsset(
            supabaseAdmin,
            authReq.userId,
          );
          const hasFaceAsset = resolveHasFaceAssetForTemplateGeneration(
            hasCompleteFaceAsset,
            use_face_asset,
          );
          selectedReferenceRow = await pickRandomReferenceRow(
            supabaseAdmin,
            template_id,
            { hasFaceAsset },
          );

          const refOk = await respondIfTemplateReferenceImageMissing(
            supabaseAdmin,
            template_id,
            selectedReferenceRow,
            locale,
            res,
          );
          if (!refOk) return;

          const faceOk = await respondIfTemplateFaceCaptureRequired(
            supabaseAdmin,
            template_id,
            selectedReferenceRow,
            hasFaceAsset,
            res,
          );
          if (!faceOk) return;

          if (selectedReferenceRow) {
            finalImagePrompt = selectedReferenceRow.image_prompt;
            const rowVideoPrompt = selectedReferenceRow.video_prompt?.trim();
            if (!rowVideoPrompt || rowVideoPrompt.length < 10) {
              return res.status(422).json({
                message:
                  "Prompt vidéo requis sur l'image de référence sélectionnée",
              });
            }
            templateVideoPrompt = rowVideoPrompt;
          } else {
            finalImagePrompt = template.prompt_text;
            templateVideoPrompt =
              typeof video_prompt === "string" && video_prompt.trim()
                ? video_prompt.trim()
                : getTemplateVideoPrompt(template.input_schema) ?? null;
            if (!templateVideoPrompt) {
              return res.status(422).json({
                message: "Prompt vidéo requis pour ce template",
              });
            }
          }
        }

        finalImagePrompt = finalImagePrompt.replace(/tanas?|92i/gi, "jolies filles");
        if (templateVideoPrompt) {
          templateVideoPrompt = templateVideoPrompt.replace(
            /tanas?|92i/gi,
            "jolies filles",
          );
        }

        const referenceMetadata = selectedReferenceRow
          ? {
              selectedTemplateReferenceImage: selectedReferenceRow.url,
              selectedTemplateReferenceImageId: selectedReferenceRow.id,
            }
          : {};

        let imageUrls: string[] = [];
        if (templateIdForGeneration) {
          imageUrls = await buildTemplateGenerationImageUrls(
            supabaseAdmin,
            authReq.userId,
            selectedReferenceRow,
          );
        } else {
          imageUrls = await uploadInputImagesToR2(authReq.userId, images);
          const mergedUrls = await appendDirectGenerationFaceAssetUrls(
            supabaseAdmin,
            authReq.userId,
            imageUrls,
            use_face_asset,
            locale,
            res,
          );
          if (mergedUrls === null) return;
          imageUrls = mergedUrls;
        }

        if (
          (templateIdForGeneration && !selectedReferenceRow?.url) ||
          (!templateIdForGeneration && imageUrls.length === 0)
        ) {
          return res.status(422).json({
            code: "REFERENCE_IMAGE_REQUIRED",
            message: tBackend(locale, "larps.referenceImageRequired"),
          });
        }

        let externalTaskId: string;
        let generationMetadata: Record<string, unknown>;

        if (templateIdForGeneration) {
          let imageTask: StartedImageGenerationTask;
          try {
            imageTask = await startImageGenerationTask({
              prompt: finalImagePrompt,
              aspectRatio,
              imageUrls,
            });
          } catch (err) {
            if (isGoogleAiPromptFlagged(err)) {
              return res.status(422).json({
                code: "PROMPT_POLICY_VIOLATION",
                message: tBackend(locale, "larps.policyViolation"),
              });
            }

            logger.error(
              { err },
              "Failed to start image stage for template video generation",
            );
            return res
              .status(502)
              .json({ message: tBackend(locale, "larps.taskCreateFailed") });
          }

          externalTaskId = imageTask.providerTaskId;
          generationMetadata = {
            workflow: "template_image_to_video",
            stage: "image",
            imageProvider: imageTask.provider,
            imageTaskId: imageTask.providerTaskId,
            originalInputAssets: imageUrls,
            ...referenceMetadata,
            videoPromptText: templateVideoPrompt,
          };
        } else {
          // 3. Call KIE Runway API directly for non-template videos
          const runwayResponse = await createRunwayVideoTask({
            prompt: finalImagePrompt,
            image: imageUrls[0],
            aspectRatio,
          });

          if (runwayResponse.code !== 200 || !runwayResponse.data?.task_id) {
            const msg = (runwayResponse as any).msg || tBackend(locale, "larps.taskCreateFailed");
            return res.status(422).json({ message: msg });
          }

          externalTaskId = `video_${runwayResponse.data.task_id}`;
          generationMetadata = {
            workflow: "direct_runway",
            stage: "video",
            runwayTaskId: externalTaskId,
            sourceImageUrl: imageUrls[0] ?? null,
            ...referenceMetadata,
          };
        }

        // 4. Store in generations, then charge through the credit ledger.
        const { data: larp, error: insertErr } = await supabaseAdmin
          .from("generations")
          .insert({
            user_id: authReq.userId,
            template_id: templateIdForGeneration,
            generation_type: "video",
            prompt: finalImagePrompt,
            final_prompt: finalImagePrompt,
            provider: "runway",
            provider_task_id: externalTaskId,
            status: "processing",
            aspect_ratio: aspectRatio,
            input_assets: imageUrls,
            credit_cost: creditCost,
            metadata: generationMetadata,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        const deductErr = await deductGenerationCredits(supabaseAdmin, {
          userId: authReq.userId,
          creditCost,
          generationId: larp.id,
          source: "video_generation",
          metadata: {
            provider: "runway",
            provider_task_id: externalTaskId,
            workflow: generationMetadata.workflow,
            stage: generationMetadata.stage,
            ...referenceMetadata,
          },
        });
        if (deductErr) {
          await markCreditDeductionFailed(supabaseAdmin, larp.id);
          logger.error({ err: deductErr }, "Failed to deduct credits");
          return res
            .status(500)
            .json({ message: tBackend(locale, "larps.creditDeductionFailed") });
        }

        await recordGeneration(authReq.userId);

        res.status(201).json({
          id: larp.id,
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

  // GET /api/larps/can-generate
  app.get(api.larps.canGenerate.path, requireAuth, async (req, res) => {
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

  // GET /api/larps/:taskId/status
  app.get(api.larps.status.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const locale = resolveLocaleFromRequest(req);
      const { taskId } = req.params;
      const supabaseAdmin = getSupabaseAdmin();

      // Verify this task belongs to the user. The DB filter is a broad
      // substring match (provider_task_id can hold a comma-joined chain), so
      // we re-verify the requested id is an exact delimited segment to avoid
      // a substring collision returning the wrong generation.
      const { data: larp, error: fetchErr } = await supabaseAdmin
        .from("generations")
        .select("*")
        .ilike("provider_task_id", `%${taskId}%`)
        .eq("user_id", authReq.userId)
        .single();

      const taskIdSegments = (larp?.provider_task_id || "")
        .split(",")
        .map((segment: string) => segment.trim());

      if (fetchErr || !larp || !taskIdSegments.includes(taskId)) {
        return res
          .status(404)
          .json({ message: tBackend(locale, "larps.taskNotFound") });
      }

      // If already terminal, return cached result
      if (larp.status === "succeeded" || larp.status === "failed") {
        if (larp.status === "failed") {
          const refundErr = await refundGenerationCreditsIfCharged(supabaseAdmin, {
            userId: authReq.userId,
            generationId: larp.id,
            source: "cached_failed_status",
            failMessage: larp.fail_message,
            metadata: {
              provider: larp.provider,
              provider_task_id: larp.provider_task_id,
            },
          });
          if (refundErr) {
            logger.error(
              { err: refundErr, larpId: larp.id },
              "Failed to refund failed generation credits",
            );
          }
        }

        // Check subscriber status for watermark decision
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("is_subscriber, role")
          .eq("id", authReq.userId)
          .single();
        const isSubscriber =
          profile?.is_subscriber || profile?.role === "admin";

        const originals = toAssetList(larp.output_assets);
        const watermarkedList = toAssetList(larp.watermarked_assets);
        const resolvedUrls =
          watermarkedList.length > 0 && !isSubscriber
            ? watermarkedList
            : originals.length > 0
              ? originals
              : watermarkedList;

        return res.json({
          larpId: larp.id,
          status: toClientGenerationStatus(larp.status),
          resultUrls: resolvedUrls,
          watermarkedUrls: watermarkedList,
          failMessage: larp.fail_message,
          costTime: toNullableNumber(larp.cost_time),
          isSubscriber,
          requiresPaywall: false,
          resultType: larp.generation_type === "video" ? "video" : "image",
        });
      }

      const activeTaskId = (larp.provider_task_id || "").split(",").pop() as string;
      const isCustomApi = activeTaskId.startsWith("custom_");
      const isVideoTask = activeTaskId.startsWith("video_");
      const metadata = getGenerationMetadata(larp);
      const isVideoGeneration = larp.generation_type === "video";
      // Stay in the image→video handler for the whole pre-Runway window
      // (stage "image" or transient "starting_video"); routing flips to the
      // Runway poller only once a `video_*` task id has been appended.
      const isTemplateVideoImageStage =
        isVideoGeneration &&
        metadata.workflow === "template_image_to_video" &&
        !isVideoTask;

      let apiStatus: "waiting" | "success" | "fail" = "waiting";
      let apiResultJson: any = null;
      let apiFailMsg: string | null = null;
      let apiCostTime: number | null = null;
      const resultType: "image" | "video" = isVideoGeneration ? "video" : "image";

      if (isTemplateVideoImageStage) {
        const imagePoll = await pollChainedVideoImageStage({
          activeTaskId,
          larp,
          locale,
          supabaseAdmin,
        });

        if (imagePoll.providerTaskUpdated || imagePoll.status === "waiting") {
          return res.json({
            larpId: larp.id,
            status: "waiting",
            resultUrls: [],
            failMessage: null,
            costTime: null,
            isSubscriber: false,
            requiresPaywall: false,
            resultType,
          });
        }

        apiStatus = imagePoll.status;
        apiResultJson = imagePoll.resultJson;
        apiFailMsg = imagePoll.failMsg;
        apiCostTime = imagePoll.costTime;

        if (apiStatus === "success" && apiResultJson) {
          let generatedImageUrls: string[] = [];
          try {
            const parsed =
              typeof apiResultJson === "string"
                ? JSON.parse(apiResultJson)
                : apiResultJson;
            const originalInputUrls = uniqueStrings([
              ...(Array.isArray(larp.input_assets) ? larp.input_assets : []),
              ...(Array.isArray(metadata.originalInputAssets)
                ? metadata.originalInputAssets
                : []),
              metadata.selectedTemplateReferenceImage,
            ]);
            generatedImageUrls = extractGeneratedImageUrlsForVideoStage(
              parsed,
              originalInputUrls,
            );
          } catch (parseErr) {
            logger.error(
              { err: parseErr, rawResultJson: apiResultJson },
              "Failed to parse chained video image resultJson",
            );
          }

          if (generatedImageUrls.length === 0) {
            apiStatus = "fail";
            apiFailMsg = tBackend(locale, "larps.taskCreateFailed");
          } else {
            let storedImageUrls = generatedImageUrls;
            try {
              storedImageUrls = await downloadAndStoreImages(
                larp.id,
                generatedImageUrls,
              );
            } catch (err) {
              logger.error(
                { err, larpId: larp.id },
                "Failed to store chained video image to R2, keeping provider URL",
              );
            }

            const generatedImageUrl = storedImageUrls[0];
            try {
              const videoPromptText =
                typeof metadata.videoPromptText === "string"
                  ? metadata.videoPromptText.trim()
                  : "";
              if (!videoPromptText) {
                throw new Error("Missing template video prompt");
              }

              // Atomically claim the image→video transition so concurrent
              // status polls cannot launch a second Runway task (double spend).
              const { data: claimedRows, error: claimErr } = await supabaseAdmin
                .from("generations")
                .update({
                  metadata: {
                    ...metadata,
                    stage: "starting_video",
                    generatedImageUrl,
                    generatedImageAssets: storedImageUrls,
                  },
                  updated_at: new Date().toISOString(),
                })
                .eq("id", larp.id)
                .eq("metadata->>stage", "image")
                .select("id");
              if (claimErr) throw claimErr;
              if (!claimedRows || claimedRows.length === 0) {
                // Another concurrent poll already started the video stage.
                return res.json({
                  larpId: larp.id,
                  status: "waiting",
                  resultUrls: [],
                  failMessage: null,
                  costTime: null,
                  isSubscriber: false,
                  requiresPaywall: false,
                  resultType,
                });
              }

              const runwayResponse = await createRunwayVideoTask({
                prompt: videoPromptText,
                image: generatedImageUrl,
                aspectRatio: larp.aspect_ratio || OUTPUT_ASPECT_RATIO,
              });

              if (runwayResponse.code !== 200 || !runwayResponse.data?.task_id) {
                const msg =
                  (runwayResponse as any).msg ||
                  tBackend(locale, "larps.taskCreateFailed");
                throw new RunwayApiError(msg, runwayResponse.code, msg);
              }

              const runwayExternalTaskId = `video_${runwayResponse.data.task_id}`;
              const inputAssets = Array.isArray(larp.input_assets)
                ? larp.input_assets
                : [];
              await supabaseAdmin
                .from("generations")
                .update({
                  provider_task_id: `${larp.provider_task_id},${runwayExternalTaskId}`,
                  input_assets: uniqueStrings([...inputAssets, generatedImageUrl]),
                  metadata: {
                    ...metadata,
                    stage: "video",
                    generatedImageUrl,
                    generatedImageAssets: storedImageUrls,
                    runwayTaskId: runwayExternalTaskId,
                  },
                  updated_at: new Date().toISOString(),
                })
                .eq("id", larp.id);

              return res.json({
                larpId: larp.id,
                status: "waiting",
                resultUrls: [],
                failMessage: null,
                costTime: null,
                isSubscriber: false,
                requiresPaywall: false,
                resultType,
              });
            } catch (err) {
              logger.error(
                { err, larpId: larp.id },
                "Failed to start Runway stage for template video generation",
              );
              apiStatus = "fail";
              apiFailMsg =
                err instanceof RunwayApiError
                  ? err.apiMsg
                  : tBackend(locale, "larps.taskCreateFailed");
            }
          }
        }
      } else if (isVideoTask) {
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
          // Transient provider/network blip: keep the job alive and let the
          // client retry instead of permanently failing a running generation.
          if (
            Date.now() - new Date(larp.created_at).getTime() <
            PROVIDER_POLL_HARD_TIMEOUT_MS
          ) {
            return res.json({
              larpId: larp.id,
              status: "waiting",
              resultUrls: [],
              failMessage: null,
              costTime: null,
              isSubscriber: false,
              requiresPaywall: false,
              resultType,
            });
          }
          apiStatus = "fail";
          apiFailMsg = tBackend(locale, "larps.pollingError");
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
              : tBackend(locale, "larps.pollingError"),
          };
        }
        
        const currentSettings = await getAppSettings();
        const ageInMs = Date.now() - new Date(larp.created_at).getTime();
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
              { larpId: larp.id, jobId },
              "OneshotAPI rejected prompt, skipping Kie AI fallback",
            );
            apiStatus = "fail";
            apiFailMsg = tBackend(locale, "larps.policyViolation");
          } else {
            logger.info(
              { larpId: larp.id, isTimeout },
              "Custom API failed or timeout, triggering Kie AI fallback",
            );
            try {
              const aspect_ratio = larp.aspect_ratio || OUTPUT_ASPECT_RATIO;
              const imageUrls = Array.isArray(larp.input_assets) ? larp.input_assets : [];
              const fallbackKieResponse = await createKieTask({
                prompt: larp.final_prompt,
                aspect_ratio,
                ...(imageUrls.length > 0 ? { image_input: imageUrls } : {}),
              });
             
              if (fallbackKieResponse.code === 200 && fallbackKieResponse.data?.taskId) {
                const newKieTaskIdString = `${larp.provider_task_id},${fallbackKieResponse.data.taskId}`;
                await supabaseAdmin
                  .from("generations")
                  .update({
                    provider: "fallback",
                    provider_task_id: newKieTaskIdString,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", larp.id);
                 
                return res.json({
                  larpId: larp.id,
                  status: "waiting",
                  resultUrls: [],
                  failMessage: null,
                  costTime: null,
                  isSubscriber: false,
                  requiresPaywall: false,
                });
              } else {
                apiStatus = "fail";
                apiFailMsg = tBackend(locale, "larps.fallbackFailed");
              }
            } catch (fallbackErr: any) {
              logger.error({ err: fallbackErr }, "Kie fallback also failed");
              apiStatus = "fail";
              apiFailMsg = tBackend(locale, "larps.fallbackFailed");
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
          // Transient provider/network blip: keep the job alive and let the
          // client retry instead of permanently failing a running generation.
          if (
            Date.now() - new Date(larp.created_at).getTime() <
            PROVIDER_POLL_HARD_TIMEOUT_MS
          ) {
            return res.json({
              larpId: larp.id,
              status: "waiting",
              resultUrls: [],
              failMessage: null,
              costTime: null,
              isSubscriber: false,
              requiresPaywall: false,
              resultType,
            });
          }
          apiStatus = "fail";
          apiFailMsg = tBackend(locale, "larps.pollingError");
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
                const key = `larps/${larp.id}/video.mp4`;
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
              resultUrls = await downloadAndStoreImages(larp.id, resultUrls);
            } catch (err) {
              logger.error(
                { err, larpId: larp.id },
                "Failed to re-upload images to R2, keeping original URLs",
              );
            }
          }

          if (resultUrls.length === 0) {
            apiStatus = "fail";
            apiFailMsg = tBackend(locale, "larps.taskCreateFailed");
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

        // Persist the terminal status first so a later refund failure can
        // never leave the generation stuck in "processing".
        await supabaseAdmin
          .from("generations")
          .update({
            status: toDbStatus(apiStatus),
            output_assets: resultUrls,
            watermarked_assets: watermarkedUrls.length > 0 ? watermarkedUrls : [],
            fail_message: apiFailMsg || null,
            cost_time: toNullableNumber(apiCostTime),
            updated_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .eq("id", larp.id);

        // Refunds are idempotent (keyed on the charge ledger); on failure we
        // log and let a subsequent poll retry rather than blocking the client.
        if (apiStatus === "fail") {
          const refundErr = await refundGenerationCreditsIfCharged(supabaseAdmin, {
            userId: authReq.userId,
            generationId: larp.id,
            source: "generation_failed",
            failMessage: apiFailMsg,
            metadata: {
              provider: larp.provider,
              provider_task_id: larp.provider_task_id,
              result_type: resultType,
            },
          });
          if (refundErr) {
            logger.error(
              { err: refundErr, larpId: larp.id },
              "Failed to refund failed generation credits",
            );
          }
        }

        return res.json({
          larpId: larp.id,
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
        larpId: larp.id,
        status: "waiting",
        resultUrls: [],
        failMessage: null,
        costTime: null,
        isSubscriber: false,
        requiresPaywall: false,
        resultType,
      });
    } catch (error: any) {
      logger.error({ err: error }, "Error checking larp status");
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
    }
  });

  // GET /api/larps/history
  app.get(api.larps.history.path, requireAuth, async (req, res) => {
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
        .select("*, templates(name, name_en, template_categories(slug, name, name_en))")
        .eq("user_id", authReq.userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      res.json((data ?? []).map(toLarpDto));
    } catch (error: any) {
      logger.error({ err: error }, "Error fetching larp history");
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
    }
  });

  // GET /api/larps/:larpId/download/:imageIndex
  app.get(api.larps.download.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const locale = resolveLocaleFromRequest(req);
      const { larpId, imageIndex } = req.params;
      const index = parseInt(imageIndex, 10);
      const supabaseAdmin = getSupabaseAdmin();

      if (isNaN(index) || index < 0) {
        return res
          .status(400)
          .json({ message: tBackend(locale, "larps.invalidImageIndex") });
      }

      const { data: larp, error } = await supabaseAdmin
        .from("generations")
        .select("output_assets, watermarked_assets, generation_type")
        .eq("id", larpId)
        .eq("user_id", authReq.userId)
        .single();

      const originals = toAssetList(larp?.output_assets);
      if (error || !larp || originals.length === 0) {
        return res
          .status(404)
          .json({ message: tBackend(locale, "larps.notFound") });
      }

      // Check subscriber status — non-subscribers get watermarked version
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_subscriber, role")
        .eq("id", authReq.userId)
        .single();
      const isSubscriber = profile?.is_subscriber || profile?.role === "admin";

      const watermarked = toAssetList(larp.watermarked_assets);
      const urls =
        !isSubscriber && watermarked.length > 0 ? watermarked : originals;

      if (index >= urls.length) {
        return res
          .status(404)
          .json({ message: tBackend(locale, "larps.imageNotFound") });
      }

      const assetUrl = urls[index];
      const assetResponse = await fetch(assetUrl);
      if (!assetResponse.ok) {
        return res
          .status(502)
          .json({ message: tBackend(locale, "larps.fetchImageFailed") });
      }

      const generationType =
        larp.generation_type === "video" ? "video" : "image";
      const { contentType, extension } = inferDownloadMediaMeta(
        assetUrl,
        assetResponse.headers.get("content-type"),
        generationType,
      );

      const randomSuffix = Math.random().toString(36).substring(2, 8);

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="larp-${randomSuffix}.${extension}"`,
      );
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

      const arrayBuffer = await assetResponse.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      logger.error({ err: error }, "Error downloading larp asset");
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
    }
  });

  // DELETE /api/larps/:larpId
  app.delete(api.larps.delete.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { larpId } = req.params;
      const supabaseAdmin = getSupabaseAdmin();

      const { error } = await supabaseAdmin
        .from("generations")
        .delete()
        .eq("id", larpId)
        .eq("user_id", authReq.userId);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "Error deleting larp");
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
    }
  });

  // =============================================
  // ADMIN: GENERATION LOGS
  // =============================================

  const generationLogsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(500).default(100),
  });

  app.get(
    api.admin.generationLogs.path,
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const { limit } = generationLogsQuerySchema.parse({
          limit: req.query.limit ?? 100,
        });
        const supabaseAdmin = getSupabaseAdmin();

        const { data, error } = await supabaseAdmin
          .from("generations")
          .select(
            "*, profiles(email), templates(name, name_en, template_categories(slug, name, name_en))",
          )
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;
        res.json((data ?? []).map(toAdminGenerationLogDto));
      } catch (error: any) {
        logger.error({ err: error }, "Error fetching admin generation logs");
        const locale = resolveLocaleFromRequest(req);
        res
          .status(500)
          .json({ message: tBackend(locale, "common.internalServerError") });
      }
    },
  );

  app.delete(
    api.admin.clearGenerationLogs.path,
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const supabaseAdmin = getSupabaseAdmin();

        const { error, count } = await supabaseAdmin
          .from("generations")
          .delete({ count: "exact" })
          .neq("id", "00000000-0000-0000-0000-000000000000");

        if (error) throw error;

        const deletedCount = count ?? 0;
        logger.info(
          { adminUserId: authReq.userId, deletedCount },
          "Admin cleared all generation logs",
        );
        res.json({ deletedCount });
      } catch (error: any) {
        logger.error({ err: error }, "Error clearing admin generation logs");
        const locale = resolveLocaleFromRequest(req);
        res
          .status(500)
          .json({ message: tBackend(locale, "common.internalServerError") });
      }
    },
  );

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
    admin_plan: z
      .enum(["free", "discovery", "essential", "ultimate", "weekly", "monthly", "image", "video"])
      .optional(),
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

  app.get(
    api.admin.userActivity.path,
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const supabaseAdmin = getSupabaseAdmin();

        const { data: profile, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("id, email, full_name, role, is_subscriber, credits, generation_count, created_at")
          .eq("id", id)
          .single();

        if (profileError || !profile) {
          return res.status(404).json({ message: "Utilisateur introuvable" });
        }

        const [generationsResult, ledgerResult] = await Promise.all([
          supabaseAdmin
            .from("generations")
            .select("*, templates(name, name_en, template_categories(slug, name, name_en))")
            .eq("user_id", id)
            .order("created_at", { ascending: false })
            .limit(100),
          supabaseAdmin
            .from("credit_ledger")
            .select("id, generation_id, subscription_id, delta, balance_after, reason, metadata, created_at")
            .eq("user_id", id)
            .order("created_at", { ascending: false })
            .limit(200),
        ]);

        if (generationsResult.error) throw generationsResult.error;
        if (ledgerResult.error) throw ledgerResult.error;

        const ledgerEntries = ledgerResult.data ?? [];
        const creditsByGeneration = ledgerEntries.reduce((acc, entry) => {
          if (!entry.generation_id) return acc;
          const existing = acc.get(entry.generation_id) ?? {
            charged: 0,
            refunded: 0,
            entries: [] as any[],
          };
          if (entry.reason === "generation_charge" && entry.delta < 0) {
            existing.charged += Math.abs(entry.delta);
          }
          if (entry.reason === "refund" && entry.delta > 0) {
            existing.refunded += entry.delta;
          }
          existing.entries.push({
            id: entry.id,
            delta: entry.delta,
            balanceAfter: entry.balance_after,
            reason: entry.reason,
            createdAt: entry.created_at,
            metadata: entry.metadata ?? {},
          });
          acc.set(entry.generation_id, existing);
          return acc;
        }, new Map<string, { charged: number; refunded: number; entries: any[] }>());

        const generations = (generationsResult.data ?? []).map((row) => {
          const credits = creditsByGeneration.get(row.id) ?? {
            charged: 0,
            refunded: 0,
            entries: [],
          };
          return {
            ...toLarpDto(row),
            prompt: row.prompt,
            provider: row.provider,
            creditCost: row.credit_cost ?? 0,
            creditsCharged: credits.charged,
            creditsRefunded: credits.refunded,
            netCredits: credits.charged - credits.refunded,
            creditEntries: credits.entries,
          };
        });

        const totalCharged = ledgerEntries
          .filter((entry) => entry.reason === "generation_charge" && entry.delta < 0)
          .reduce((sum, entry) => sum + Math.abs(entry.delta), 0);
        const totalRefunded = ledgerEntries
          .filter((entry) => entry.reason === "refund" && entry.delta > 0)
          .reduce((sum, entry) => sum + entry.delta, 0);
        const subscriptionGranted = ledgerEntries
          .filter((entry) => entry.reason === "subscription_grant" && entry.delta > 0)
          .reduce((sum, entry) => sum + entry.delta, 0);
        const adminAdjustments = ledgerEntries
          .filter((entry) => entry.reason === "admin_adjustment")
          .reduce((sum, entry) => sum + entry.delta, 0);

        res.json({
          profile: {
            id: profile.id,
            email: profile.email,
            fullName: profile.full_name,
            role: profile.role,
            isSubscriber: profile.is_subscriber,
            credits: profile.credits,
            generationCount: profile.generation_count,
            createdAt: profile.created_at,
          },
          summary: {
            generationCount: generations.length,
            failedGenerations: generations.filter((item) => item.status === "fail").length,
            totalCharged,
            totalRefunded,
            netSpent: totalCharged - totalRefunded,
            subscriptionGranted,
            adminAdjustments,
          },
          generations,
          creditLedger: ledgerEntries.map((entry) => ({
            id: entry.id,
            generationId: entry.generation_id,
            subscriptionId: entry.subscription_id,
            delta: entry.delta,
            balanceAfter: entry.balance_after,
            reason: entry.reason,
            metadata: entry.metadata ?? {},
            createdAt: entry.created_at,
          })),
        });
      } catch (error: any) {
        logger.error({ err: error }, "Error fetching admin user activity");
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
