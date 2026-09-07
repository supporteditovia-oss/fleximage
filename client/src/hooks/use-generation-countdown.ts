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
 * Compte à rebours monotone basé sur l'horodatage réel de début (created_at).
 * Recalcule immédiatement au retour d'onglet (Snapchat, appel, etc.).
 */
export function useGenerationCountdown(
  startedAtMs: number | null | undefined,
  estimatedSeconds: number,
  isComplete: boolean,
): number {
  const estimate = Math.max(1, Math.round(estimatedSeconds));

  const [remaining, setRemaining] = useState(() => {
    if (isComplete) return 0;
    if (!startedAtMs) return estimate;
    return computeGenerationRemaining(startedAtMs, estimate);
  });

  const lastStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (isComplete) {
      setRemaining(0);
      return;
    }
    if (!startedAtMs) return;

    // Si le début serveur arrive après le 1er rendu, resync sans jamais augmenter.
    if (lastStartedAtRef.current !== startedAtMs) {
      lastStartedAtRef.current = startedAtMs;
      setRemaining((prev) => {
        const computed = computeGenerationRemaining(startedAtMs, estimate);
        return prev === 0 ? computed : Math.min(prev, computed);
      });
    }

    const tick = () => {
      const computed = computeGenerationRemaining(startedAtMs, estimate);
      setRemaining((prev) => (prev === 0 ? computed : Math.min(prev, computed)));
    };

    tick();
    const id = window.setInterval(tick, 250);
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [startedAtMs, estimate, isComplete]);

  return isComplete ? 0 : remaining;
}
