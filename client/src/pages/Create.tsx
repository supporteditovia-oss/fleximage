import { useEffect, useState } from "react";
import { Redirect, useLocation } from "wouter";
import {
  readStudioMode,
  type StudioMode,
} from "@/lib/v2-experience";
import { useV2Access } from "@/hooks/use-v2-access";
import { useAuth } from "@/hooks/use-auth";
import { VoiceStudioMock } from "@/components/v2/VoiceStudioMock";
import { AuthResolveShell } from "@/components/v2/AuthResolveShell";
import { FakeOnboardingLoader } from "@/components/larp/FakeOnboardingLoader";
import { useOnboardingFakeLoader } from "@/hooks/use-onboarding-fake-loader";
import { getOnboardingResume } from "@/lib/onboarding-resume";
import { getPaywallImage } from "@/lib/paywall-image";
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
    document.documentElement.classList.remove("luxeflexia-video-page");
    return () => {
      document.documentElement.classList.remove("luxeflexia-create-page");
      document.documentElement.classList.remove("luxeflexia-generate-page");
    };
  }, [mode]);
}

export default function Create() {
  const { v2Enabled, isLoading: gateLoading } = useV2Access();
  const { user, profile, isAdmin } = useAuth();
  const [, navigate] = useLocation();
  const mode = useStudioMode();
  const [gateTimedOut, setGateTimedOut] = useState(false);

  const { showFakeLoader: showVideoFakeLoader, finishFakeLoader: finishVideoFakeLoader } =
    useOnboardingFakeLoader({
      mode: "video",
      enabled: mode === "video" && Boolean(user),
      isSubscriber: Boolean(
        profile?.is_subscriber || profile?.role === "admin" || isAdmin,
      ),
      userId: profile?.id,
    });

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
    if (mode !== "video" || showVideoFakeLoader) return;
    const resume = getOnboardingResume();
    if (resume?.generationMode === "video") return;
    navigate("/video-ia", { replace: true });
  }, [mode, navigate, showVideoFakeLoader]);

  if (gateLoading && !gateTimedOut) {
    return <AuthResolveShell />;
  }

  if (!v2Enabled) {
    return <Redirect to="/generate" />;
  }

  if (showVideoFakeLoader) {
    return (
      <FakeOnboardingLoader
        inputImageUrl={getPaywallImage() ?? undefined}
        onComplete={finishVideoFakeLoader}
      />
    );
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
