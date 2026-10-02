const { getSourceVideoUrlFromLarp } = require("./mux-source-audio");
const { resetVideoProviderClaim } = require("./v2v-provider-errors");

const MAX_OMNI_JOBS_PER_V2V = 2;

function countOmniJobsInProviderTaskId(providerTaskId) {
  return String(providerTaskId || "")
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.startsWith("omni_")).length;
}

function canLaunchAnotherOmniJob(providerTaskId) {
  return countOmniJobsInProviderTaskId(providerTaskId) < MAX_OMNI_JOBS_PER_V2V;
}

/**
 * Relance Transform (Kling 3.0 Omni) après rejet Motion / Aleph ou incident Omni — sans re-débit.
 */
async function relaunchOmniV2VFromLarp(supabase, larp, pollMeta, userId, reason) {
  const { generateOmniRef2VOnce } = require("./generate-video-once");
  const { buildOmniTransformPrompt } = require("./video-studio");
  const { resolveOmniSourceVideoUrl } = require("./prepare-kling-source-video");
  const { ensureKieAccessibleMediaUrl } = require("./kie-file-upload");
  const {
    normalizeVideoUltraResolution,
  } = require("../../shared/video-ultra-pricing.cjs");

  const userPrompt = String(
    larp.prompt || pollMeta.vehicle_prompt_raw || pollMeta.vehicle_prompt || "",
  ).trim();
  const sourceVideoUrl =
    pollMeta.source_video_url || getSourceVideoUrlFromLarp(larp);
  if (!sourceVideoUrl) {
    throw new Error("missing source video for omni poll relaunch");
  }

  const preparedUrl = await resolveOmniSourceVideoUrl(sourceVideoUrl, userId);
  const videoUrl = await ensureKieAccessibleMediaUrl(preparedUrl, "video");

  await resetVideoProviderClaim(supabase, larp.id, pollMeta);
  await generateOmniRef2VOnce(supabase, {
    generationId: larp.id,
    prompt: buildOmniTransformPrompt(userPrompt, {
      preserveSourceAudio: pollMeta.preserve_source_audio === true,
    }),
    videoUrl,
    resolution: normalizeVideoUltraResolution(pollMeta.v2v_resolution || "720p"),
  });

  const { data: refreshed } = await supabase
    .from("generations")
    .select("metadata, provider_task_id")
    .eq("id", larp.id)
    .single();

  const prevRetries = Number(pollMeta.video_auto_retries) || 0;
  const mergedMeta = {
    ...(refreshed?.metadata && typeof refreshed.metadata === "object"
      ? refreshed.metadata
      : pollMeta),
    v2v_provider: "runway_aleph",
    v2v_engine_family: "transform",
    v2v_omni_poll_fallback: true,
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

  console.info("[status] v2v omni poll relaunch", {
    larpId: larp.id,
    reason,
    retries: mergedMeta.video_auto_retries,
  });

  return mergedMeta;
}

module.exports = {
  MAX_OMNI_JOBS_PER_V2V,
  countOmniJobsInProviderTaskId,
  canLaunchAnotherOmniJob,
  relaunchOmniV2VFromLarp,
};
