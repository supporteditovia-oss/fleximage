/** Miroir de api/_lib/generation-display-timing.js */

export function computePollRemainingSeconds(
  estimatedSeconds: number,
  elapsedSec: number,
  phase: "generating" | "finalize" | "done" = "generating",
): number {
  const E = Math.max(15, Math.round(estimatedSeconds));
  const elapsed = Math.max(0, Math.floor(elapsedSec));

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

export function pollRemainingFromStart(
  estimatedSeconds: number,
  startedAtMs: number,
  nowMs: number = Date.now(),
): number {
  const elapsed = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  return computePollRemainingSeconds(estimatedSeconds, elapsed, "generating");
}
