import FloatingHeader from "@/components/layout/FloatingHeader";
import HeroSection from "@/components/marketing/HeroSection";
import ImageMarquee from "@/components/marketing/ImageMarquee";
import FaqSection from "@/components/marketing/FaqSection";
import CtaSection from "@/components/marketing/CtaSection";
import Footer from "@/components/marketing/Footer";

export default function Landing() {
  return (
    <div className="relative overflow-hidden">
      <FloatingHeader />
      <HeroSection />
      <ImageMarquee />
      <FaqSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
