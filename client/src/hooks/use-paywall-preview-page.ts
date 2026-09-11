import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { getPaywallImage, clearPaywallImage } from "@/lib/paywall-image";
import { getPaywallPrompt, clearPaywallPrompt } from "@/lib/paywall-prompt";
import {
  clearPaywallExpiry,
  ensurePaywallExpiry,
  formatPaywallCountdown,
  getPaywallExpiresAt,
  getPaywallMsRemaining,
  isPaywallExpired,
  PAYWALL_PREVIEW_TTL_MS,
} from "@/lib/paywall-expiry";
import { markFakePaywallReached, clearFakePaywallReached } from "@/lib/fake-paywall-state";
import type { PaywallGenerationMode } from "@/lib/fake-paywall-state";

function purgeExpiredPreview() {
  clearPaywallImage();
  clearPaywallPrompt();
  clearPaywallExpiry();
  clearFakePaywallReached();
}

export function usePaywallPreviewPage(
  mode: PaywallGenerationMode,
  profileId?: string | null,
) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [msRemaining, setMsRemaining] = useState(0);
  const [expired, setExpired] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const countdownLabel = formatPaywallCountdown(msRemaining);
  const isUrgent = !expired && msRemaining > 0 && msRemaining <= 60_000;

  const requiresImage = mode === "image" || mode === "video";

  useEffect(() => {
    const image = getPaywallImage();
    const prompt = getPaywallPrompt();
    const existingExpiry = getPaywallExpiresAt();
    const now = Date.now();

    if (requiresImage && !image && !(mode === "video" && prompt?.trim())) {
      setImageUrl(null);
      setUserPrompt(prompt);
      setExpiresAt(null);
      setMsRemaining(0);
      setExpired(true);
      clearPaywallExpiry();
      setHydrated(true);
      return;
    }

    if (!requiresImage && !prompt?.trim()) {
      setImageUrl(null);
      setUserPrompt(null);
      setExpiresAt(null);
      setMsRemaining(0);
      setExpired(true);
      clearPaywallExpiry();
      setHydrated(true);
      return;
    }

    if (isPaywallExpired(existingExpiry, now)) {
      purgeExpiredPreview();
      setImageUrl(null);
      setUserPrompt(null);
      setExpiresAt(null);
      setMsRemaining(0);
      setExpired(true);
      setHydrated(true);
      return;
    }

    const deadline = ensurePaywallExpiry(now);
    setImageUrl(image);
    setUserPrompt(prompt);
    setExpiresAt(deadline);
    setMsRemaining(getPaywallMsRemaining(deadline, now));
    setExpired(false);
    setHydrated(true);
  }, [requiresImage]);

  useEffect(() => {
    if (!expiresAt || expired) return;
    if (paywallOpen) {
      setMsRemaining(getPaywallMsRemaining(expiresAt));
      return;
    }

    const tick = () => {
      const remaining = getPaywallMsRemaining(expiresAt);
      setMsRemaining(remaining);
      if (remaining <= 0) {
        purgeExpiredPreview();
        setImageUrl(null);
        setUserPrompt(null);
        setExpired(true);
        setPaywallOpen(false);
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [expiresAt, expired, paywallOpen]);

  useEffect(() => {
    if (!paywallOpen || expired) return;
    if (mode === "voice" && !userPrompt) return;
    if (requiresImage && !imageUrl) return;

    const minLeft = Math.min(PAYWALL_PREVIEW_TTL_MS, 10 * 60 * 1000);
    const now = Date.now();
    setExpiresAt((prev) => {
      if (prev && prev - now >= minLeft) return prev;
      const next = now + minLeft;
      try {
        window.localStorage.setItem("luxeflexia_paywall_expires_at", String(next));
      } catch {
        /* private mode */
      }
      return next;
    });
    setMsRemaining((prev) => Math.max(prev, minLeft));
  }, [paywallOpen, expired, imageUrl, userPrompt, mode, requiresImage]);

  useEffect(() => {
    if (profileId && !expired && (imageUrl || userPrompt)) {
      markFakePaywallReached(profileId, mode);
    }
  }, [profileId, expired, imageUrl, userPrompt, mode]);

  useLayoutEffect(() => {
    document.body.setAttribute("data-hide-app-chrome", "true");
    return () => {
      document.body.removeAttribute("data-hide-app-chrome");
    };
  }, []);

  const purge = useMemo(() => purgeExpiredPreview, []);

  return {
    imageUrl,
    userPrompt,
    expired,
    hydrated,
    paywallOpen,
    setPaywallOpen,
    countdownLabel,
    isUrgent,
    purgeExpiredPreview: purge,
  };
}
