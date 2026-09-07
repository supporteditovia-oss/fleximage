import { useEffect, useRef, useState } from "react";

/** Temps restant = estimate fixe − elapsed depuis le démarrage serveur. */
export function computeGenerationRemaining(
  startedAtMs: number,
  estimatedSeconds: number,
  nowMs: number = Date.now(),
): number {
  const estimate = Math.max(1, Math.round(estimatedSeconds));
  const elapsed = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  return Math.max(0, estimate - elapsed);
}

/**
 * Compte à rebours strictement monotone.
 * Priorité : remainingSeconds serveur > calcul client (estimate + startedAt verrouillés).
 */
export function useGenerationCountdown(
  taskId: string,
  startedAtMs: number | null | undefined,
  estimatedSeconds: number,
  isComplete: boolean,
  serverRemainingSeconds?: number | null,
): number {
  const estimate = Math.max(1, Math.round(estimatedSeconds));
  const floorRef = useRef<number | null>(null);
  const taskRef = useRef(taskId);
  const [, setTick] = useState(0);

  if (taskRef.current !== taskId) {
    taskRef.current = taskId;
    floorRef.current = null;
  }

  useEffect(() => {
    if (isComplete) return;

    const tick = () => setTick((n) => n + 1);
    const id = window.setInterval(tick, 250);
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isComplete, taskId]);

  if (isComplete) {
    floorRef.current = 0;
    return 0;
  }

  let candidate: number;
  if (
    typeof serverRemainingSeconds === "number" &&
    Number.isFinite(serverRemainingSeconds)
  ) {
    candidate = Math.max(0, Math.round(serverRemainingSeconds));
  } else if (startedAtMs) {
    candidate = computeGenerationRemaining(startedAtMs, estimate);
  } else {
    candidate = estimate;
  }

  if (floorRef.current === null) {
    floorRef.current = candidate;
  } else {
    floorRef.current = Math.min(floorRef.current, candidate);
  }

  return floorRef.current;
}
