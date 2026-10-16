function providerErrorText(err) {
  return `${err?.apiMsg || ""} ${err?.message || ""}`.trim();
}

function isKlingCharacterRejectionFromText(text) {
  return /no valid characters detected/i.test(String(text || "").trim());
}

function isKlingCharacterRejection(err) {
  return isKlingCharacterRejectionFromText(providerErrorText(err));
}

function isRetryableAlephError(err) {
  return /internal error|please try again later|aleph api error|video too large/i.test(
    providerErrorText(err),
  );
}

function isRetryableKlingError(err) {
  return /internal error|please try again later|kling motion control api error/i.test(
    providerErrorText(err),
  );
}

function isRetryableProviderFailText(text) {
  return /internal error|please try again later|file type not supported|video too large|timeout|task failed|generation failed|service unavailable|rate limit|too many requests|502|503|504/i.test(
    String(text || "").trim(),
  );
}

/** Relances poll Kling Motion (danse) — au-delà, message « épuisé » côté client. */
const MOTION_KLING_MAX_AUTO_RETRIES = 5;

function isNonRetryableMotionKlingFail(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  return /content policy|unsafe content|nsfw|violation|moderation|not allowed/i.test(
    t,
  );
}

function isMotionKlingPollExhausted(pollMeta) {
  return (
    (Number(pollMeta?.video_auto_retries) || 0) >= MOTION_KLING_MAX_AUTO_RETRIES
  );
}

function isMotionStudioMetadata(meta) {
  const m = meta && typeof meta === "object" ? meta : {};
  return (
    m.v2v_intent === "motion" ||
    m.v2v_provider === "kling_motion" ||
    m.v2v_engine_family === "motion"
  );
}

/**
 * Options client pour échec V2V motion — « plusieurs tentatives » seulement si relances épuisées.
 */
function motionKlingClientFailOptions(pollMeta, extra = {}) {
  const motion = extra.motionStudioJob === true || isMotionStudioMetadata(pollMeta);
  const exhausted = motion && isMotionKlingPollExhausted(pollMeta);
  return {
    afterAlephFallback: exhausted || Boolean(extra.afterAlephFallback),
    v2vExhausted: exhausted,
    v2vIntent: motion ? "motion" : extra.v2vIntent,
    v2vProvider: motion ? "kling_motion" : extra.v2vProvider,
    v2vEngineFamily: motion ? "motion" : extra.v2vEngineFamily,
  };
}

async function resetVideoProviderClaim(supabase, generationId, baseMetadata) {
  const meta =
    baseMetadata && typeof baseMetadata === "object" ? baseMetadata : {};
  await supabase
    .from("generations")
    .update({
      metadata: { ...meta, video_api_call_count: 0 },
      updated_at: new Date().toISOString(),
    })
    .eq("id", generationId);
}

module.exports = {
  providerErrorText,
  isKlingCharacterRejection,
  isKlingCharacterRejectionFromText,
  isRetryableAlephError,
  isRetryableKlingError,
  isRetryableProviderFailText,
  isNonRetryableMotionKlingFail,
  isMotionKlingPollExhausted,
  isMotionStudioMetadata,
  motionKlingClientFailOptions,
  MOTION_KLING_MAX_AUTO_RETRIES,
  resetVideoProviderClaim,
};
