import * as React from "react";
import { useFeatureFlagVariantKey, usePostHog } from "posthog-js/react";
import FloatingHeader from "@/components/layout/FloatingHeader";
import HeroSection from "@/components/marketing/HeroSection";
import SimpleHeroSection from "@/components/marketing/SimpleHeroSection";
import ImageMarquee from "@/components/marketing/ImageMarquee";
import FaqSection from "@/components/marketing/FaqSection";
import CtaSection from "@/components/marketing/CtaSection";
import Footer from "@/components/marketing/Footer";
import {
  isPostHogConfigured,
  LANDING_EXPERIMENT_FLAG_KEY,
  LANDING_EXPERIMENT_SIMPLE_VARIANT,
} from "@/lib/posthog";

export default function Landing() {
  const posthog = usePostHog();
  const variantKey = useFeatureFlagVariantKey(LANDING_EXPERIMENT_FLAG_KEY);
  const capturedVariantRef = React.useRef<string | null>(null);
  const [areLandingFlagsReady, setAreLandingFlagsReady] = React.useState(
    () => !isPostHogConfigured || !!posthog?.featureFlags?.hasLoadedFlags,
  );
  const isLandingVariantReady =
    areLandingFlagsReady || !isPostHogConfigured || variantKey !== undefined;
  const isSimpleVariant =
    isLandingVariantReady &&
    (variantKey === LANDING_EXPERIMENT_SIMPLE_VARIANT || variantKey === true);
  const landingVariant = isSimpleVariant
    ? LANDING_EXPERIMENT_SIMPLE_VARIANT
    : "control";

  React.useEffect(() => {
    if (!isPostHogConfigured) {
      return;
    }

    if (posthog?.featureFlags?.hasLoadedFlags) {
      setAreLandingFlagsReady(true);
      return;
    }

    return posthog?.onFeatureFlags(() => {
      setAreLandingFlagsReady(true);
    });
  }, [posthog]);

  React.useEffect(() => {
    if (!isLandingVariantReady) {
      return;
    }

    if (capturedVariantRef.current === landingVariant) {
      return;
    }

    capturedVariantRef.current = landingVariant;
    posthog?.capture("landing_experiment_view", {
      feature_flag_key: LANDING_EXPERIMENT_FLAG_KEY,
      feature_flag_value: variantKey ?? false,
      landing_variant: landingVariant,
      [`$feature/${LANDING_EXPERIMENT_FLAG_KEY}`]: landingVariant,
    });
  }, [isLandingVariantReady, landingVariant, posthog, variantKey]);

  return (
    <div className="relative overflow-hidden">
      <FloatingHeader />
      {isLandingVariantReady ? (
        <>
          {isSimpleVariant ? <SimpleHeroSection /> : <HeroSection />}
          <ImageMarquee compactTop={isSimpleVariant} />
        </>
      ) : (
        <section className="relative min-h-[68svh] px-4 pb-4 pt-28 min-[380px]:pt-32 md:min-h-[70svh] md:pb-6 md:pt-20" />
      )}
      <FaqSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
