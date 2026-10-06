/**
 * Temps restant poll vidéo (status API) — linéaire, aligné sur generation-display-timing.
 */
const { computePollRemainingSeconds } = require("./generation-display-timing");

function videoTimingFieldsForLarp(larp) {
  const meta =
    larp && larp.metadata && typeof larp.metadata === "object" ? larp.metadata : {};
  const estimatedRaw = meta.estimated_seconds;
  const estimatedSeconds =
    estimatedRaw != null && Number.isFinite(Number(estimatedRaw))
      ? Number(estimatedRaw)
      : null;
  if (estimatedSeconds == null || !larp?.created_at) {
    return { estimatedSeconds, remainingSeconds: null };
  }
  const qaRetryCount = Number(meta.vision_qa_retry_count || 0);
  const videoRetries = Number(meta.video_auto_retries || 0);
  const effectiveEstimate =
    estimatedSeconds + qaRetryCount * 28 + videoRetries * 35;
  const elapsed = Math.max(
    0,
    Math.floor((Date.now() - new Date(larp.created_at).getTime()) / 1000),
  );
  const remainingSeconds = computePollRemainingSeconds(
    effectiveEstimate,
    elapsed,
    "generating",
  );
  return { estimatedSeconds, remainingSeconds };
}

module.exports = {
  computePollRemainingSeconds,
  videoTimingFieldsForLarp,
};
