const {
  generateOmniRef2VOnce,
  generateVideoV2VOnce,
  readVideoApiCallCount,
} = require("./generate-video-once");
const { ensureKieAccessibleMediaUrl } = require("./kie-file-upload");
const { resolveKlingMotionSourceVideoUrl } = require("./prepare-kling-source-video");
const {
  buildAlephSubmitPrompt,
  isOmniTransformEnabled,
} = require("./video-studio");
const { getSourceVideoUrlFromLarp } = require("./mux-source-audio");
const { mapVideoProviderMessage } = require("./video-user-errors");
const {
  markVideoKickoffFailed,
  readKickoffLock,
} = require("./video-studio-kickoff");

/**
 * Démarre Kling 3.0 Omni Ref2V pour workflow video_ultra.
 */
async function kickoffVideoUltraProvider(supabase, larp, userId) {
  const meta =
    larp.metadata && typeof larp.metadata === "object" ? larp.metadata : {};

  if (readVideoApiCallCount(meta) >= 1) {
    return { larp, started: false, failed: false };
  }
  if (readKickoffLock(meta)) {
    return { larp, started: false, failed: false, inProgress: true };
  }

  await supabase
    .from("generations")
    .update({
      metadata: {
        ...meta,
        video_kickoff_started_at: new Date().toISOString(),
        studio_stage: "UPLOADING",
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", larp.id);

  let sourceAssetUrl =
    typeof meta.source_video_url === "string" && meta.source_video_url
      ? meta.source_video_url
      : getSourceVideoUrlFromLarp(larp);

  if (!sourceAssetUrl) {
    await markVideoKickoffFailed(
      supabase,
      userId,
      larp,
      "Vidéo source introuvable — réessaie l'import.",
      { skipRefund: true },
    );
    return { larp, started: false, failed: true };
  }

  const durationSec = Number(meta.ultra_duration_sec) || 5;
  const resolution = meta.ultra_resolution || "720p";
  const userPrompt = String(larp.prompt || larp.final_prompt || "").trim();

  try {
    const preserveSourceAudio = meta.preserve_source_audio === true;
    const preparedUrl = await resolveKlingMotionSourceVideoUrl(
      sourceAssetUrl,
      userId,
      { preserveSourceAudio },
    );
    const kieVideoUrl = await ensureKieAccessibleMediaUrl(preparedUrl, "video");

    if (isOmniTransformEnabled()) {
      await generateOmniRef2VOnce(supabase, {
        generationId: larp.id,
        prompt: userPrompt,
        videoUrl: kieVideoUrl,
        durationSec,
        resolution,
      });
    } else {
      await generateVideoV2VOnce(supabase, {
        generationId: larp.id,
        prompt: buildAlephSubmitPrompt(userPrompt),
        videoUrl: sourceAssetUrl,
        aspectRatio: larp.aspect_ratio || meta.aleph_aspect_ratio || "16:9",
      });
    }

    const { data: refreshed, error } = await supabase
      .from("generations")
      .select("*")
      .eq("id", larp.id)
      .single();
    if (error) throw error;

    const nextMeta = {
      ...(refreshed.metadata && typeof refreshed.metadata === "object"
        ? refreshed.metadata
        : meta),
      studio_stage: "GENERATING_VIDEO",
      video_kickoff_completed_at: new Date().toISOString(),
    };
    await supabase
      .from("generations")
      .update({ metadata: nextMeta, updated_at: new Date().toISOString() })
      .eq("id", larp.id);

    return { larp: { ...refreshed, metadata: nextMeta }, started: true, failed: false };
  } catch (err) {
    console.error("[video-ultra-kickoff] failed", err);
    const raw =
      typeof err.apiMsg === "string"
        ? err.apiMsg
        : err instanceof Error
          ? err.message
          : "Échec création vidéo";
    const friendly =
      mapVideoProviderMessage(raw, "fr") || String(raw).slice(0, 180);
    await markVideoKickoffFailed(supabase, userId, larp, friendly, {
      skipRefund: true,
    });
    return { larp, started: true, failed: true, failMessage: friendly };
  }
}

module.exports = {
  kickoffVideoUltraProvider,
};
