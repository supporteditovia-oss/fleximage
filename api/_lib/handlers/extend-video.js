const { randomUUID } = require("crypto");
const { requireUser, readBody, sendError } = require("../user-auth");
const { isUserAdmin } = require("../admin-access");
const { isRunwayConfigured, extractRunwayTaskIdFromGeneration } = require("../kie-runway");
const { generateVideoExtendOnce } = require("../generate-video-once");
const { computeVideoCreditCost } = require("../video-studio");
const {
  checkGenerationLimits,
  deductGenerationCredits,
  refundGenerationCreditsIfCharged,
  recordGeneration,
  translateLimitReason,
} = require("../generation");
const { resolveRequestLocale, copy } = require("../locale-copy");
const {
  isDisallowedAdultPrompt,
  contentPolicyResponse,
} = require("../content-policy");
const { estimateVideoGenerationSeconds } = require("../video-timing");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  if (!isRunwayConfigured()) {
    res.status(503).json({ message: "Runway / Kie.ai non configuré" });
    return;
  }

  try {
    const { supabase, userId } = await requireUser(req);
    const body = readBody(req);
    const uiLocale = resolveRequestLocale(req, body);

    const prompt =
      typeof body.prompt === "string"
        ? body.prompt.trim()
        : typeof body.motion_prompt === "string"
          ? body.motion_prompt.trim()
          : "";

    if (prompt.length < 10 || prompt.length > 2000) {
      res.status(400).json({
        message: copy(
          uiLocale,
          "Décris la suite du mouvement (10–2000 caractères).",
          "Describe how the video should continue (10–2000 characters).",
        ),
      });
      return;
    }
    if (isDisallowedAdultPrompt(prompt)) {
      res.status(422).json(contentPolicyResponse(uiLocale));
      return;
    }

    const sourceId =
      typeof body.source_generation_id === "string"
        ? body.source_generation_id.trim()
        : typeof body.source_larp_id === "string"
          ? body.source_larp_id.trim()
          : "";

    if (!UUID_RE.test(sourceId)) {
      res.status(400).json({
        message: copy(
          uiLocale,
          "Indique la vidéo source à prolonger (source_generation_id).",
          "Provide the source video generation id (source_generation_id).",
        ),
      });
      return;
    }

    const admin = await isUserAdmin(supabase, userId);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, credits")
      .eq("id", userId)
      .single();
    const isAdmin = admin || profile?.role === "admin";

    if (!isAdmin) {
      res.status(403).json({
        code: "ADMIN_PREVIEW_ONLY",
        message: copy(
          uiLocale,
          "L'extension vidéo Runway est réservée aux administrateurs (preview).",
          "Runway video extension is admin-only preview.",
        ),
      });
      return;
    }

    const { data: sourceGen, error: sourceErr } = await supabase
      .from("generations")
      .select("id, user_id, status, provider, provider_task_id, metadata, output_assets")
      .eq("id", sourceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (sourceErr) throw sourceErr;
    if (!sourceGen) {
      res.status(404).json({
        message: copy(uiLocale, "Vidéo source introuvable.", "Source video not found."),
      });
      return;
    }

    const parentRunwayTaskId = extractRunwayTaskIdFromGeneration(sourceGen);
    if (!parentRunwayTaskId) {
      res.status(422).json({
        code: "EXTEND_NOT_RUNWAY",
        message: copy(
          uiLocale,
          "Seules les vidéos générées via Runway (Image → Vidéo) peuvent être prolongées avec cette API.",
          "Only Runway-generated videos (image-to-video) can be extended with this API.",
        ),
      });
      return;
    }

    const quality = body.quality === "high" ? "high" : "standard";
    const creditCost = computeVideoCreditCost({
      workflow: "image_to_video",
      voiceEnabled: false,
      isAdmin,
    });

    const limitResult = await checkGenerationLimits(supabase, userId);
    if (!limitResult.ok) {
      res.status(limitResult.status || 429).json({
        code: limitResult.code,
        message: translateLimitReason(limitResult.reason, uiLocale),
      });
      return;
    }

    if (!isAdmin && (profile?.credits ?? 0) < creditCost) {
      res.status(402).json({
        code: "INSUFFICIENT_CREDITS",
        message: copy(uiLocale, "Crédits insuffisants.", "Insufficient credits."),
        creditCost,
      });
      return;
    }

    const videoRequestId = randomUUID();
    const estimatedSeconds = estimateVideoGenerationSeconds({
      workflow: "image_to_video",
      durationSec: 5,
    });

    const { data: larp, error: insertErr } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        status: "waiting",
        provider: "runway",
        provider_task_id: `pending_${randomUUID()}`,
        metadata: {
          video_request_id: videoRequestId,
          video_api_call_count: 0,
          studio_stage: "VALIDATING",
          workflow: "video_extend",
          source: body.source || "video_studio",
          runway_extend_source_generation_id: sourceId,
          runway_extend_parent_task_id: parentRunwayTaskId,
          quality,
          prompt_user_raw: prompt,
          estimated_seconds: estimatedSeconds,
        },
        generation_type: "video",
      })
      .select("id, created_at")
      .single();
    if (insertErr) throw insertErr;

    const debited = await deductGenerationCredits(supabase, {
      userId,
      generationId: larp.id,
      creditCost,
      isAdmin,
    });
    if (!debited.ok) {
      await supabase
        .from("generations")
        .update({
          status: "failed",
          fail_message: "Échec débit jetons",
          updated_at: new Date().toISOString(),
        })
        .eq("id", larp.id);
      res.status(500).json({ message: "Échec du débit des jetons" });
      return;
    }

    await recordGeneration(supabase, userId);

    let providerResult;
    try {
      providerResult = await generateVideoExtendOnce(supabase, {
        generationId: larp.id,
        parentRunwayTaskId,
        prompt,
        quality,
      });
    } catch (providerErr) {
      await supabase
        .from("generations")
        .update({
          status: "failed",
          fail_message: String(providerErr.message || "Échec extension Runway").slice(
            0,
            240,
          ),
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", larp.id);
      await refundGenerationCreditsIfCharged(supabase, {
        userId,
        generationId: larp.id,
        source: "video_extend_failed",
        failMessage: providerErr.message,
      }).catch(() => {});
      const providerStatus =
        typeof providerErr.status === "number" ? providerErr.status : 502;
      res.status(providerStatus >= 400 && providerStatus < 600 ? providerStatus : 502).json({
        message: copy(
          uiLocale,
          "Échec extension vidéo. Jetons remboursés.",
          "Video extension failed. Credits refunded.",
        ),
        videoRequestId,
        apiMsg: providerErr.apiMsg || null,
      });
      return;
    }

    res.status(201).json({
      id: larp.id,
      taskId: providerResult.externalTaskId,
      status: "waiting",
      estimatedSeconds,
      createdAt: larp.created_at,
      videoRequestId,
      deduplicated: Boolean(providerResult.deduplicated),
      creditCost,
      generationType: "video",
      workflow: "video_extend",
      parentRunwayTaskId,
    });
  } catch (error) {
    console.error("extend-video error", error);
    sendError(res, error);
  }
};
