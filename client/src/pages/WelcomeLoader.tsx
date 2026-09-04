import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Gem } from "lucide-react";
import {
  getMobileCompatibleLandingImages,
  LANDING_MARQUEE_IMAGES,
} from "@/lib/landing-marquee-images";
import { getOnboardingResume } from "@/lib/onboarding-resume";
import { getPaywallImage } from "@/lib/paywall-image";
import { BrandMark } from "@/components/BrandMark";
import { useTranslation } from "react-i18next";
import { applyLocaleFromSearch } from "@/i18n";
import { createPathForUser } from "@/lib/v2-experience";
import { useV2Access } from "@/hooks/use-v2-access";
import "./welcome.css";

const WELCOME_DURATION_MS = 1800;
const WELCOME_ONBOARDING_DURATION_MS = 700;
/** Ne jamais rester bloqué sur le gate V2. */
const GATE_MAX_WAIT_MS = 2800;

const bgImages = getMobileCompatibleLandingImages(LANDING_MARQUEE_IMAGES).slice(
  0,
  4,
);

export default function WelcomeLoader() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { v2Enabled, isLoading: gateLoading } = useV2Access();
  const [gateTimedOut, setGateTimedOut] = useState(false);

  useEffect(() => {
    applyLocaleFromSearch(window.location.search);
  }, []);

  useEffect(() => {
    if (!gateLoading) return;
    const timer = window.setTimeout(() => setGateTimedOut(true), GATE_MAX_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [gateLoading]);

  useEffect(() => {
    const ready = !gateLoading || gateTimedOut;
    if (!ready) return;

    const hasOnboardingDraft =
      Boolean(getOnboardingResume()) && Boolean(getPaywallImage());
    const duration = hasOnboardingDraft
      ? WELCOME_ONBOARDING_DURATION_MS
      : WELCOME_DURATION_MS;

    const timer = window.setTimeout(() => {
      navigate(createPathForUser(gateTimedOut ? false : v2Enabled), {
        replace: true,
      });
    }, duration);

    return () => window.clearTimeout(timer);
  }, [gateLoading, gateTimedOut, navigate, v2Enabled]);

  return (
    <div className="welcome-page" role="status" aria-live="polite">
      <div className="welcome-bg" aria-hidden="true">
        {bgImages.map((image) => (
          <img
            key={image.id}
            className="welcome-bg-img"
            src={image.webp_url ?? image.avif_url}
            alt=""
            loading="eager"
            decoding="async"
          />
        ))}
      </div>
      <div className="welcome-glow" aria-hidden="true" />

      <div className="welcome-content">
        <div className="welcome-brand">
          <Gem className="welcome-brand-mark" strokeWidth={1.75} aria-hidden />
          <BrandMark
            className="welcome-brand-text"
            accentClassName="welcome-brand-accent"
          />
        </div>
        <div className="welcome-spinner" aria-hidden="true" />
        <p className="welcome-caption">{t("welcome.preparingSpace")}</p>
      </div>
    </div>
  );
}
