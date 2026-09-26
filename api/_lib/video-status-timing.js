/**
 * Temps restant affiché pendant le poll vidéo — calé pour ne pas tomber à 0 avant la fin réelle.
 * Utilisé par status.js (remainingSeconds) ; le client interpole entre deux polls.
 */

function computeVideoPollRemainingSeconds(estimatedSeconds, elapsedSec, phase = "generating") {
  const E = Math.max(30, Math.round(Number(estimatedSeconds) || 0));
  const elapsed = Math.max(0, Math.floor(Number(elapsedSec) || 0));

  if (phase === "done") return 0;
  if (phase === "finalize") {
    return Math.max(3, Math.min(12, 10 - Math.floor(elapsed / 4)));
  }

  if (elapsed < E) {
    const ratio = Math.max(0, 1 - elapsed / E);
    const curved = Math.pow(ratio, 0.72) * E;
    return Math.max(1, Math.round(curved));
  }

  const overtime = elapsed - E;
  return Math.max(5, Math.round(48 - overtime / 2.5));
}

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
  const elapsed = Math.max(
    0,
    Math.floor((Date.now() - new Date(larp.created_at).getTime()) / 1000),
  );
  const remainingSeconds = computeVideoPollRemainingSeconds(
    estimatedSeconds,
    elapsed,
    "generating",
  );
  return { estimatedSeconds, remainingSeconds };
}

module.exports = {
  computeVideoPollRemainingSeconds,
  videoTimingFieldsForLarp,
};
