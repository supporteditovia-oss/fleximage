import LandingHeader from "@/components/marketing/LandingHeader";
import HeroSection from "@/components/marketing/HeroSection";
import ShowcaseSection from "@/components/marketing/ShowcaseSection";
import FeaturesSection from "@/components/marketing/FeaturesSection";
import FaqSection from "@/components/marketing/FaqSection";
import CtaSection from "@/components/marketing/CtaSection";
import Footer from "@/components/marketing/Footer";
import { useEffect } from "react";
import { trackFunnelStep } from "@/lib/funnel-tracker";
import "./landing.css";

export default function Landing() {
  useEffect(() => {
    trackFunnelStep("landing", { source: "home" });
  }, []);

  return (
    <div className="luxeflexia-landing relative overflow-x-hidden">
      <LandingHeader />
      <HeroSection />
      <ShowcaseSection />
      <FeaturesSection />
      <CtaSection />
      <FaqSection />
      <Footer />
    </div>
  );
}
