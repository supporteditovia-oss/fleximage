import { useLocation } from "wouter";
import { setStudioMode, type StudioMode } from "@/lib/voice/selected-voice";
import { stopVoicePreview } from "@/lib/voice/play-preview";
import "@/pages/voice-studio.css";

/** Image IA / Voix IA toggle, shown on both studio pages. */
export function StudioModeSwitch({ mode }: { mode: StudioMode }) {
  const [, setLocation] = useLocation();

  const go = (next: StudioMode) => {
    if (next === mode) return;
    stopVoicePreview();
    setStudioMode(next);
    setLocation(next === "image" ? "/generate" : "/create?mode=voice");
  };

  return (
    <div className="mode-switch" role="tablist" aria-label="Mode du studio">
      <button
        type="button"
        role="tab"
        aria-selected={mode === "image"}
        className={mode === "image" ? "is-active" : ""}
        onClick={() => go("image")}
      >
        Image IA
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "voice"}
        className={mode === "voice" ? "is-active" : ""}
        onClick={() => go("voice")}
      >
        Voix IA
      </button>
    </div>
  );
}
