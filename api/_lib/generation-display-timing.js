/**
 * Compte à rebours affiché pendant le poll — linéaire pour que 0 ≈ fin réelle.
 * Miroir client : client/src/lib/generation-display-timing.ts
 */

function computePollRemainingSeconds(
  estimatedSeconds,
  elapsedSec,
  phase = "generating",
) {
  const E = Math.max(15, Math.round(Number(estimatedSeconds) || 0));
  const elapsed = Math.max(0, Math.floor(Number(elapsedSec) || 0));

  if (phase === "done") return 0;
  if (phase === "finalize") {
    return Math.max(1, Math.min(8, 8 - Math.floor(elapsed / 3)));
  }

  const linear = E - elapsed;
  if (linear > 0) {
    return Math.max(1, Math.round(linear));
  }

  const overtime = elapsed - E;
  return Math.max(0, Math.round(14 - overtime / 6));
}

module.exports = { computePollRemainingSeconds };
