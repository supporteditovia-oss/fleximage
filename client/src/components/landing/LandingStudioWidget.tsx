import { useEffect, useState } from "react";
import { StudioModeSwitch } from "@/components/v2/StudioModeSwitch";
import { VoiceStudioMock } from "@/components/v2/VoiceStudioMock";
import { LandingImagePanel } from "@/components/landing/LandingImagePanel";
import { LandingVideoPanel } from "@/components/landing/LandingVideoPanel";
import {
  readStudioMode,
  writeStudioMode,
  type StudioMode,
} from "@/lib/v2-experience";
import "@/pages/create-page.css";
import "@/pages/generate-page.css";
import "./landing-studio-widget.css";

const MODE_CAPTIONS: Record<StudioMode, string> = {
  image:
    "Atelier Image — une photographie, une intention, un rendu lifestyle photoréaliste.",
  voice:
    "Atelier Voix — quelques secondes d’audio suffisent pour créer votre signature vocale.",
  video:
    "Atelier Vidéo — cinématique photo ou séquence transformée. Format vertical 9:16, rendu premium.",
};

export function LandingStudioWidget() {
  const [mode, setMode] = useState<StudioMode>(() => readStudioMode());

  useEffect(() => {
    const sync = () => setMode(readStudioMode());
    sync();
    window.addEventListener("luxeflexia:studio-mode", sync);
    return () => window.removeEventListener("luxeflexia:studio-mode", sync);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("luxeflexia-create-page");
    if (mode === "image") {
      document.documentElement.classList.add("luxeflexia-generate-page");
    } else {
      document.documentElement.classList.remove("luxeflexia-generate-page");
    }
    if (mode === "video") {
      document.documentElement.classList.add("luxeflexia-video-page");
    } else {
      document.documentElement.classList.remove("luxeflexia-video-page");
    }
    return () => {
      document.documentElement.classList.remove(
        "luxeflexia-create-page",
        "luxeflexia-generate-page",
        "luxeflexia-video-page",
      );
    };
  }, [mode]);

  const handleMode = (next: StudioMode) => {
    setMode(next);
    writeStudioMode(next);
  };

  return (
    <div className="landing-studio-widget">
      <StudioModeSwitch mode={mode} onChange={handleMode} className="landing-studio-widget__tabs" />
      <p className="landing-studio-widget__caption">{MODE_CAPTIONS[mode]}</p>
      <div className="landing-studio-widget__panel" key={mode}>
        {mode === "image" ? (
          <LandingImagePanel />
        ) : mode === "voice" ? (
          <VoiceStudioMock guestFunnel />
        ) : (
          <LandingVideoPanel />
        )}
      </div>
    </div>
  );
}
