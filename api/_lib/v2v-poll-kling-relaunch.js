const {
  getSourceVideoUrlFromLarp,
  getReferenceImageUrlFromLarp,
} = require("./mux-source-audio");
const { resetVideoProviderClaim } = require("./v2v-provider-errors");
const {
  buildV2VProviderPrompt,
  buildKlingMotionStudioPrompt,
  isV2VMotionStudioJob,
} = require("./video-studio");
const { extractReferenceFrameFromVideoUrl } = require("./extract-video-frame");
const { resolveKlingMotionSourceVideoUrl } = require("./prepare-kling-source-video");

/**
 * Relance Kling Motion après échecs Aleph poll (internal error) — sans re-débit.
 */
async function relaunchKlingV2VFromLarp(
  supabase,
  larp,
  pollMeta,
  userId,
  reason,
  relaunchOptions = {},
) {
  const { generateKlingMotionOnce } = require("./generate-video-once");
  const preserveSourceAudio = pollMeta.preserve_source_audio === true;
  const userPrompt = String(
    larp.prompt || pollMeta.vehicle_prompt || "",
  ).trim();
  const motionStudio =
    relaunchOptions.motionStudio === true || isV2VMotionStudioJob(pollMeta);
  const providerPrompt = motionStudio
    ? buildKlingMotionStudioPrompt(userPrompt, { preserveSourceAudio })
    : buildV2VProviderPrompt(userPrompt, { preserveSourceAudio });
  const sourceVideoUrl =
    pollMeta.source_video_url || getSourceVideoUrlFromLarp(larp);
  if (!sourceVideoUrl) {
    throw new Error("missing source video for kling poll relaunch");
  }

  const videoUrl = await resolveKlingMotionSourceVideoUrl(
    sourceVideoUrl,
    userId,
    { preserveSourceAudio },
  );
  let imageUrl = getReferenceImageUrlFromLarp(larp);
  const motionReferenceSource =
    pollMeta.motion_reference_source === "uploaded" ||
    pollMeta.motion_reference_source === "auto_frame"
      ? pollMeta.motion_reference_source
      : imageUrl
        ? "uploaded"
        : "auto_frame";
  if (!imageUrl) {
    imageUrl = await extractReferenceFrameFromVideoUrl(videoUrl, userId);
  }
  if (!imageUrl) {
    throw new Error("missing reference frame for kling poll relaunch");
  }

  await resetVideoProviderClaim(supabase, larp.id, pollMeta);
  await generateKlingMotionOnce(supabase, {
    generationId: larp.id,
    prompt: providerPrompt,
    imageUrl,
    videoUrl,
    mode: "720p",
    userId,
    motionReferenceSource,
  });

  const { data: refreshed } = await supabase
    .from("generations")
    .select("metadata, provider_task_id")
    .eq("id", larp.id)
    .single();

  const prevRetries = Number(pollMeta.video_auto_retries) || 0;
  const afterAleph = relaunchOptions.afterAlephFallback === true;
  const mergedMeta = {
    ...(refreshed?.metadata && typeof refreshed.metadata === "object"
      ? refreshed.metadata
      : pollMeta),
    ...(afterAleph ? { v2v_aleph_poll_kling_fallback: true } : {}),
    ...(motionStudio && !afterAleph
      ? { v2v_kling_motion_poll_retry: true }
      : {}),
    v2v_provider: "kling_motion",
    studio_stage: "GENERATING",
    video_auto_retries: prevRetries + 1,
    v2v_poll_relaunch_reason: reason,
  };

  await supabase
    .from("generations")
    .update({
      status: "processing",
      fail_message: null,
      provider_task_id: refreshed?.provider_task_id || larp.provider_task_id,
      metadata: mergedMeta,
      updated_at: new Date().toISOString(),
      completed_at: null,
    })
    .eq("id", larp.id);

  console.info("[status] v2v kling poll relaunch after aleph fail", {
    larpId: larp.id,
    reason,
    retries: mergedMeta.video_auto_retries,
  });

  return mergedMeta;
}

module.exports = { relaunchKlingV2VFromLarp };
