import { useEffect, useState } from "react";
import { getStudioMode, type StudioMode } from "@/lib/voice/selected-voice";

/** Reactive studio mode ("image" | "voice") shared across dock and pages. */
export function useStudioMode(): StudioMode {
  const [mode, setMode] = useState<StudioMode>(() => getStudioMode());

  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: StudioMode }>).detail;
      setMode(detail?.mode ?? getStudioMode());
    };
    window.addEventListener("luxeflexia:studio-mode", sync);
    return () => window.removeEventListener("luxeflexia:studio-mode", sync);
  }, []);

  return mode;
}
