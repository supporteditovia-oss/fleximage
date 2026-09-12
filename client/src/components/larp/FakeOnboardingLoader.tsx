import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { GenerationLoader } from "./GenerationLoader";
import { VoiceGenerationLoader } from "@/components/v2/VoiceGenerationLoader";
import "./generation-loader.css";
import "@/components/v2/voice-generation-loader.css";

/** Durée crédible pour l'essai gratuit — même UX que les abonnés. */
const DEFAULT_DURATION_MS = 14_000;

interface FakeOnboardingLoaderProps {
  inputImageUrl?: string | null;
  durationMs?: number;
  variant?: "image" | "voice";
  onComplete: () => void;
}

export function FakeOnboardingLoader({
  inputImageUrl,
  durationMs = DEFAULT_DURATION_MS,
  variant = "image",
  onComplete,
}: FakeOnboardingLoaderProps) {
  const startedAtMs = useRef(Date.now());
  const estimateSec = Math.max(8, Math.round(durationMs / 1000));
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    document.documentElement.setAttribute("data-fullscreen-overlay", "true");
    document.body.setAttribute("data-fullscreen-overlay", "true");
    window.$crisp?.push(["do", "chat:hide"]);

    const timer = window.setTimeout(() => {
      onCompleteRef.current();
    }, durationMs);

    return () => {
      window.clearTimeout(timer);
      document.documentElement.removeAttribute("data-fullscreen-overlay");
      document.body.removeAttribute("data-fullscreen-overlay");
      window.$crisp?.push(["do", "chat:show"]);
    };
  }, [durationMs]);

  if (variant === "voice") {
    return (
      <VoiceGenerationLoader
        taskId="onboarding-voice-fake"
        status="waiting"
        estimatedSeconds={estimateSec}
        startedAtMs={startedAtMs.current}
      />
    );
  }

  return createPortal(
    <GenerationLoader
      taskId="onboarding-fake"
      status="waiting"
      estimatedSeconds={estimateSec}
      startedAtMs={startedAtMs.current}
      inputImageUrl={inputImageUrl ?? undefined}
    />,
    document.body,
  );
}
