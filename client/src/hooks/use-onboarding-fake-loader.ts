import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getOnboardingResume, clearOnboardingResume } from "@/lib/onboarding-resume";
import { getPaywallImage } from "@/lib/paywall-image";
import { getPaywallPrompt } from "@/lib/paywall-prompt";
import {
  getPaywallExpiresAt,
  isPaywallExpired,
} from "@/lib/paywall-expiry";
import {
  hasReachedFakePaywall,
  clearFakePaywallReached,
  markFakePaywallReached,
} from "@/lib/fake-paywall-state";
import { clearPaywallImage } from "@/lib/paywall-image";
import { clearPaywallPrompt } from "@/lib/paywall-prompt";
import { clearPaywallExpiry, resetPaywallExpiry } from "@/lib/paywall-expiry";
import { previewPathForMode, type LandingFunnelMode } from "@/lib/landing-funnel";

type UseOnboardingFakeLoaderOptions = {
  mode: LandingFunnelMode;
  enabled: boolean;
  isSubscriber: boolean;
  userId?: string | null;
  onRestorePrompt?: (prompt: string) => void;
};

/** Reprend le funnel landing → auth → faux loader → page cadenas. */
export function useOnboardingFakeLoader({
  mode,
  enabled,
  isSubscriber,
  userId,
  onRestorePrompt,
}: UseOnboardingFakeLoaderOptions) {
  const [, navigate] = useLocation();
  const [showFakeLoader, setShowFakeLoader] = useState(false);

  useEffect(() => {
    if (!enabled || isSubscriber) return;

    const resume = getOnboardingResume();
    if (!resume || resume.generationMode !== mode) return;

    const paywallPreview = getPaywallImage();
    const paywallPrompt = getPaywallPrompt();
    const paywallExpiresAt = getPaywallExpiresAt();
    const previewStillValid =
      mode === "voice"
        ? Boolean(paywallPrompt?.trim()) &&
          Boolean(paywallExpiresAt) &&
          !isPaywallExpired(paywallExpiresAt)
        : Boolean(paywallPreview) &&
          Boolean(paywallExpiresAt) &&
          !isPaywallExpired(paywallExpiresAt);

    if (hasReachedFakePaywall(userId) && !previewStillValid) {
      clearFakePaywallReached();
      clearPaywallImage();
      clearPaywallPrompt();
      clearPaywallExpiry();
      clearOnboardingResume();
      return;
    }

    if (mode === "voice") {
      if (!paywallPrompt?.trim()) return;
    } else if (mode === "video") {
      if (!paywallPreview && !paywallPrompt?.trim()) return;
    } else if (!paywallPreview) {
      return;
    }

    if (hasReachedFakePaywall(userId) && previewStillValid) {
      clearOnboardingResume();
      navigate(previewPathForMode(mode));
      return;
    }

    if (resume.prompt && onRestorePrompt) {
      onRestorePrompt(resume.prompt);
    }

    setShowFakeLoader(true);
  }, [enabled, isSubscriber, mode, navigate, onRestorePrompt, userId]);

  const finishFakeLoader = () => {
    setShowFakeLoader(false);
    markFakePaywallReached(userId ?? undefined, mode);
    resetPaywallExpiry();
    clearOnboardingResume();
    navigate(previewPathForMode(mode));
  };

  return { showFakeLoader, finishFakeLoader };
}
