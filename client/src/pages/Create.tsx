import { useEffect, useState } from "react";
import { Redirect, useLocation } from "wouter";
import {
  readStudioMode,
  type StudioMode,
} from "@/lib/v2-experience";
import { useV2Access } from "@/hooks/use-v2-access";
import { VoiceStudioMock } from "@/components/v2/VoiceStudioMock";
import { AuthResolveShell } from "@/components/v2/AuthResolveShell";
import Generate from "@/pages/Generate";
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
    return () => {
      document.documentElement.classList.remove("luxeflexia-create-page");
      document.documentElement.classList.remove("luxeflexia-generate-page");
    };
  }, [mode]);
}

export default function Create() {
  const { v2Enabled, isLoading: gateLoading } = useV2Access();
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
    </>
  );
}
