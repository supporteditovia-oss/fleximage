import { useEffect } from "react";
import { Redirect, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { FakeOnboardingLoader } from "@/components/larp/FakeOnboardingLoader";
import { useOnboardingFakeLoader } from "@/hooks/use-onboarding-fake-loader";
import { getOnboardingResume } from "@/lib/onboarding-resume";
import { getPaywallImage } from "@/lib/paywall-image";
import { pathAfterWelcome, type LandingFunnelMode } from "@/lib/landing-funnel";
import { useV2Access } from "@/hooks/use-v2-access";
import { VOICE_FAKE_GEN_MS } from "@/lib/voice-generation-timing";

/** Reprend voix / vidéo landing → auth → faux loader → page cadenas (tous les comptes). */
export default function OnboardingResumePage() {
  const { user, profile, isAdmin } = useAuth();
  const { v2Enabled } = useV2Access();
  const [, navigate] = useLocation();

  const resume = getOnboardingResume();
  const mode: LandingFunnelMode =
    resume?.generationMode === "video"
      ? "video"
      : resume?.generationMode === "voice"
        ? "voice"
        : "image";

  const isSubscriber = Boolean(
    profile?.is_subscriber || profile?.role === "admin" || isAdmin,
  );

  const { showFakeLoader, finishFakeLoader } = useOnboardingFakeLoader({
    mode,
    enabled: Boolean(user) && mode !== "image",
    isSubscriber,
    userId: profile?.id,
  });

  useEffect(() => {
    if (!user || isSubscriber) return;
    if (mode === "image") return;
    if (showFakeLoader) return;

    const stillPending = getOnboardingResume();
    if (!stillPending || stillPending.generationMode !== mode) {
      navigate(pathAfterWelcome(v2Enabled), { replace: true });
    }
  }, [user, isSubscriber, mode, showFakeLoader, navigate, v2Enabled]);

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (isSubscriber) {
    return <Redirect to={pathAfterWelcome(v2Enabled)} />;
  }

  if (!resume || mode === "image") {
    return <Redirect to={pathAfterWelcome(v2Enabled)} />;
  }

  if (showFakeLoader) {
    return (
      <FakeOnboardingLoader
        variant={mode === "voice" ? "voice" : "image"}
        durationMs={mode === "voice" ? VOICE_FAKE_GEN_MS : undefined}
        inputImageUrl={mode === "video" ? getPaywallImage() ?? undefined : undefined}
        onComplete={finishFakeLoader}
      />
    );
  }

  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-[var(--lx-gold)]" aria-hidden />
      <p className="text-sm text-[var(--lx-muted)]">Préparation de ton aperçu…</p>
    </div>
  );
}
