const {
  getSourceVideoUrlFromLarp,
  getReferenceImageUrlFromLarp,
} = require("./mux-source-audio");
const { resetVideoProviderClaim } = require("./v2v-provider-errors");
const { buildAlephSubmitPrompt } = require("./video-studio");

/**
 * Relance Aleph V2V après échec poll Kling ou incident Kie — sans re-débit.
 */
async function relaunchAlephV2VFromLarp(supabase, larp, pollMeta, reason) {
  const { generateVideoV2VOnce } = require("./generate-video-once");
  const preserveSourceAudio = pollMeta.preserve_source_audio === true;
  const userPrompt = String(
    larp.prompt || pollMeta.vehicle_prompt || "",
  ).trim();
  const alephPrompt = buildAlephSubmitPrompt(userPrompt, {
    preserveSourceAudio,
  });
  const sourceVideoUrl =
    pollMeta.source_video_url || getSourceVideoUrlFromLarp(larp);
  const referenceImage = getReferenceImageUrlFromLarp(larp);

  if (!sourceVideoUrl) {
    throw new Error("missing source video for aleph poll relaunch");
  }

  await resetVideoProviderClaim(supabase, larp.id, pollMeta);
  await generateVideoV2VOnce(supabase, {
    generationId: larp.id,
    prompt: alephPrompt,
    videoUrl: sourceVideoUrl,
    aspectRatio: larp.aspect_ratio || "9:16",
    referenceImage,
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
    v2v_kling_poll_aleph_fallback:
      pollMeta.v2v_kling_poll_aleph_fallback === true ||
      reason === "kling_character" ||
      reason === "kling_internal",
    v2v_provider: "runway_aleph",
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

  console.info("[status] v2v aleph poll relaunch", {
    larpId: larp.id,
    reason,
    retries: mergedMeta.video_auto_retries,
  });

  return mergedMeta;
}

module.exports = { relaunchAlephV2VFromLarp };
