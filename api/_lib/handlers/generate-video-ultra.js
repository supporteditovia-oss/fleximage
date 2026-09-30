const { randomUUID } = require("crypto");
const { requireUser, readBody, sendError } = require("../user-auth");
const { isUserAdmin } = require("../admin-access");
const {
  uploadInputVideoToR2,
  isOwnedR2PublicUrl,
} = require("../r2");
const {
  VIDEO_V2V_MAX_SIZE_BYTES,
  validateSourceVideoDuration,
} = require("../video-limits");
const {
  computeVideoUltraCreditCost,
  normalizeVideoUltraDuration,
  normalizeVideoUltraResolution,
} = require("../../../shared/video-ultra-pricing.cjs");
const { isKlingOmniRef2VConfigured } = require("../kie-kling-omni-ref2v");
const { recordGeneration } = require("../generation");
const {
  findRecentInFlightGeneration,
  buildDedupGenerateResponse,
} = require("../generation-dedup");
const { resolveRequestLocale, copy } = require("../locale-copy");
const {
  isDisallowedAdultPrompt,
  contentPolicyResponse,
} = require("../content-policy");
const { estimateVideoGenerationSeconds } = require("../video-timing");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeVideoRequestId(raw) {
  if (typeof raw !== "string") return randomUUID();
  const id = raw.trim();
  return UUID_RE.test(id) ? id : randomUUID();
}

async function findByVideoRequestId(supabase, videoRequestId) {
  const { data: rows, error } = await supabase
    .from("generations")
    .select("*")
    .contains("metadata", { video_request_id: videoRequestId })
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return rows && rows[0] ? rows[0] : null;
}

async function resolveSourceVideoUrl(userId, body) {
  if (typeof body.video_url === "string" && body.video_url.startsWith("http")) {
    if (!isOwnedR2PublicUrl(body.video_url)) {
      throw Object.assign(new Error("URL vidéo non autorisée"), {
        status: 422,
        code: "VIDEO_URL_FORBIDDEN",
      });
    }
    return body.video_url;
  }
  const videos = Array.isArray(body.videos) ? body.videos : [];
  if (videos.length === 0) {
    throw Object.assign(new Error("Une vidéo source est requise"), {
      status: 422,
      code: "REFERENCE_VIDEO_REQUIRED",
    });
  }
  const raw = String(videos[0] || "");
  const sizeMatch = raw.match(/^data:video\/[\w+.-]+;base64,([\s\S]+)$/);
  if (sizeMatch) {
    const byteLen = Buffer.byteLength(sizeMatch[1], "base64");
    if (byteLen > VIDEO_V2V_MAX_SIZE_BYTES) {
      throw Object.assign(
        new Error(
          `Vidéo trop lourde (max ${Math.round(VIDEO_V2V_MAX_SIZE_BYTES / (1024 * 1024))} Mo).`,
        ),
        { status: 422, code: "VIDEO_TOO_LARGE" },
      );
    }
  }
  const uploaded = await uploadInputVideoToR2(userId, videos[0]);
  if (!uploaded) {
    throw Object.assign(new Error("Échec upload vidéo (MP4 requis)"), {
      status: 422,
      code: "VIDEO_UPLOAD_FAILED",
    });
  }
  return uploaded;
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    if (!isKlingOmniRef2VConfigured()) {
      res.status(503).json({
        message: "Transformation Pro indisponible (configuration studio).",
      });
      return;
    }

    const { supabase, userId } = await requireUser(req);
    const body = readBody(req);
    const uiLocale = resolveRequestLocale(req, body);

    const prompt =
      typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (prompt.length < 10 || prompt.length > 3000) {
      res.status(400).json({
        message: copy(
          uiLocale,
          "Décris la transformation (10–3000 caractères).",
          "Describe the transformation (10–3000 characters).",
        ),
      });
      return;
    }
    if (isDisallowedAdultPrompt(prompt)) {
      res.status(422).json(contentPolicyResponse(uiLocale));
      return;
    }

    const durationSec = normalizeVideoUltraDuration(body.duration_sec);
    const resolution = normalizeVideoUltraResolution(body.resolution);

    const admin = await isUserAdmin(supabase, userId);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, credits")
      .eq("id", userId)
      .single();
    const isAdmin = admin || profile?.role === "admin";
    const creditCost = isAdmin
      ? 0
      : computeVideoUltraCreditCost({ durationSec, resolution });

    if (!isAdmin) {
      const balance = Number(profile?.credits) || 0;
      if (balance < creditCost) {
        res.status(402).json({
          code: "INSUFFICIENT_CREDITS",
          message: copy(
            uiLocale,
            "Plus assez de jetons pour cette transformation.",
            "Not enough credits for this transformation.",
          ),
          creditCost,
          credits: balance,
        });
        return;
      }
    }

    const inFlight = await findRecentInFlightGeneration(supabase, userId);
    if (inFlight) {
      res.status(200).json(buildDedupGenerateResponse(inFlight));
      return;
    }

    const videoRequestId = normalizeVideoRequestId(body.video_request_id);
    const existing = await findByVideoRequestId(supabase, videoRequestId);
    if (existing) {
      if (existing.status === "failed") {
        res.status(409).json({
          code: "VIDEO_ALREADY_FAILED",
          message: copy(
            uiLocale,
            "Cette transformation a déjà échoué. Lance une nouvelle génération.",
            "This transformation already failed. Start a new generation.",
          ),
          videoRequestId,
        });
        return;
      }
      res.status(200).json({
        ...buildDedupGenerateResponse(existing),
        videoRequestId,
      });
      return;
    }

    let sourceAssetUrl;
    let sourceVideoDurationSec = null;
    try {
      sourceAssetUrl = await resolveSourceVideoUrl(userId, body);
      if (body.source_video_duration_sec != null) {
        sourceVideoDurationSec = Number(body.source_video_duration_sec);
        const durCheck = validateSourceVideoDuration(
          sourceVideoDurationSec,
          uiLocale,
        );
        if (!durCheck.ok) {
          throw Object.assign(new Error(durCheck.message), {
            status: 422,
            code: "VIDEO_DURATION_INVALID",
          });
        }
      }
    } catch (srcErr) {
      res.status(srcErr.status || 422).json({
        code: srcErr.code || "SOURCE_REQUIRED",
        message: srcErr.message,
      });
      return;
    }

    const pendingTaskId = `pending_${randomUUID()}`;
    const studioMetadata = {
      video_request_id: videoRequestId,
      pending_task_id: pendingTaskId,
      video_api_call_count: 0,
      studio_stage: "VALIDATING",
      workflow: "video_ultra",
      source: body.source || "video_ultra",
      defer_credit_charge: true,
      ultra_duration_sec: durationSec,
      ultra_resolution: resolution,
      source_video_url: sourceAssetUrl,
      source_video_duration_sec: sourceVideoDurationSec,
      ai_label: "Vidéo générée ou modifiée par IA.",
      estimated_seconds: estimateVideoGenerationSeconds({
        workflow: "video_to_video",
        durationSec,
        quality: resolution === "4k" ? "high" : "standard",
        sourceVideoDurationSec: sourceVideoDurationSec || durationSec,
      }),
    };

    const { data: larp, error: insertErr } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        template_id: null,
        generation_type: "video",
        prompt,
        final_prompt: prompt,
        provider: "kie",
        provider_task_id: pendingTaskId,
        status: "processing",
        aspect_ratio: "16:9",
        input_assets: [sourceAssetUrl],
        credit_cost: creditCost,
        metadata: studioMetadata,
        provider_attempts: [],
        output_assets: [],
        watermarked_assets: [],
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    await recordGeneration(supabase, userId);

    studioMetadata.studio_stage = "QUEUED";
    await supabase
      .from("generations")
      .update({
        metadata: studioMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", larp.id);

    res.status(201).json({
      id: larp.id,
      taskId: pendingTaskId,
      status: "waiting",
      estimatedSeconds: studioMetadata.estimated_seconds,
      createdAt: larp.created_at,
      videoRequestId,
      deduplicated: false,
      creditCost,
      generationType: "video",
      workflow: "video_ultra",
    });
  } catch (error) {
    console.error("generate-video-ultra error", error);
    sendError(res, error);
  }
};

module.exports.config = {
  api: {
    bodyParser: { sizeLimit: "25mb" },
  },
  maxDuration: 60,
};
