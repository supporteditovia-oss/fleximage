import { useEffect, useState } from "react";
import { Redirect, useLocation } from "wouter";
import {
  readStudioMode,
  type StudioMode,
} from "@/lib/v2-experience";
import { useV2Access } from "@/hooks/use-v2-access";
import { useAuth } from "@/hooks/use-auth";
import { writeStudioMode } from "@/lib/v2-experience";
import { VoiceStudioMock } from "@/components/v2/VoiceStudioMock";
import { AuthResolveShell } from "@/components/v2/AuthResolveShell";
import Generate from "@/pages/Generate";
import VideoIA from "@/pages/VideoIA";
import "./create-page.css";

function useStudioMode() {
  const [mode, setMode] = useState<StudioMode>(() => readStudioMode());

  useEffect(() => {
    const sync = () => setMode(readStudioMode());
    sync();
    window.addEventListener("luxeflexia:studio-mode", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("luxeflexia:studio-mode", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return mode;
}

function useCreatePageClass(mode: StudioMode) {
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
      document.documentElement.classList.remove("luxeflexia-create-page");
      document.documentElement.classList.remove("luxeflexia-generate-page");
    };
  }, [mode]);
}

export default function Create() {
  const { v2Enabled, isLoading: gateLoading } = useV2Access();
  const { isAdmin } = useAuth();
  const [, navigate] = useLocation();
  const mode = useStudioMode();
  const [gateTimedOut, setGateTimedOut] = useState(false);

  useCreatePageClass(mode);

  useEffect(() => {
    if (!gateLoading) return;
    const timer = window.setTimeout(() => setGateTimedOut(true), 2500);
    return () => window.clearTimeout(timer);
  }, [gateLoading]);

  useEffect(() => {
    if (gateLoading && !gateTimedOut) return;
    if (!v2Enabled) {
      navigate("/generate", { replace: true });
    }
  }, [gateLoading, gateTimedOut, navigate, v2Enabled]);

  useEffect(() => {
    if (mode === "video" && !isAdmin) {
      writeStudioMode("image");
    }
  }, [mode, isAdmin]);

  if (gateLoading && !gateTimedOut) {
    return <AuthResolveShell />;
  }

  if (!v2Enabled) {
    return <Redirect to="/generate" />;
  }

  return (
    <>
      {/* Generate reste monté en mode voix pour éviter les crashs portal/DOM au switch. */}
      <div className={mode === "image" ? undefined : "hidden"} aria-hidden={mode !== "image"}>
        <Generate basePath="/create" />
      </div>
      {mode === "voice" ? <VoiceStudioMock /> : null}
      {mode === "video" ? <VideoIA embedded /> : null}
    </>
  );
}
