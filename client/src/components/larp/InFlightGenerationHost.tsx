import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/hooks/use-auth";
import { GenerationProgress } from "@/components/larp/GenerationProgress";
import {
  clearInFlightGeneration,
  GENERATION_IN_FLIGHT_EVENT,
  getInFlightGeneration,
  type InFlightGeneration,
} from "@/lib/in-flight-generation";

/**
 * Overlay global : la génération continue (poll) même si l'utilisateur
 * change de page, quitte l'onglet (Snapchat, appel), puis revient.
 */
export function InFlightGenerationHost() {
  const { user } = useAuth();
  const [inflight, setInflight] = useState<InFlightGeneration | null>(() =>
    getInFlightGeneration(),
  );

  const sync = useCallback(() => {
    setInflight(getInFlightGeneration());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(GENERATION_IN_FLIGHT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(GENERATION_IN_FLIGHT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  const handleReset = useCallback(() => {
    clearInFlightGeneration();
    setInflight(null);
  }, []);

  if (!user || !inflight?.taskId) return null;

  return createPortal(
    <GenerationProgress
      taskId={inflight.taskId}
      initialEstimatedSeconds={inflight.estimatedSeconds}
      initialStartedAtMs={inflight.startedAtMs}
      onReset={handleReset}
      resultType="image"
    />,
    document.body,
  );
}
