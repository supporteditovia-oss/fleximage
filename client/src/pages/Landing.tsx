import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import LandingHeader from "@/components/marketing/LandingHeader";
import HeroSection from "@/components/marketing/HeroSection";
import ShowcaseSection from "@/components/marketing/ShowcaseSection";
import FeaturesSection from "@/components/marketing/FeaturesSection";
import FaqSection from "@/components/marketing/FaqSection";
import CtaSection from "@/components/marketing/CtaSection";
import Footer from "@/components/marketing/Footer";
import { trackFunnelStep } from "@/lib/funnel-tracker";
import { setDocumentMeta } from "@/lib/document-meta";
import "./landing.css";

export default function Landing() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    trackFunnelStep("landing", { source: "home" });
  }, []);

  useEffect(() => {
    const isEn = i18n.resolvedLanguage === "en";
    setDocumentMeta({
      title: isEn
        ? "LuxeFlexIA — Create hyper-realistic lifestyle photos with AI"
        : t("meta:titles.home"),
      description: t("meta:descriptions.home"),
      canonicalPath: "/",
      ogTitle: isEn
        ? "LuxeFlexIA — Hyper-realistic AI lifestyle photos"
        : undefined,
    });
  }, [i18n.resolvedLanguage, t]);

  return (
    <div className="luxeflexia-landing relative overflow-x-hidden">
      <LandingHeader showLanguageSwitch />
      <HeroSection />
      <ShowcaseSection />
      <FeaturesSection />
      <CtaSection />
      <FaqSection />
      <Footer />
    </div>
  );
}
