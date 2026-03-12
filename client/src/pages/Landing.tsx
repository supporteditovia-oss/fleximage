import FloatingHeader from "@/components/layout/FloatingHeader";
import HeroSection from "@/components/marketing/HeroSection";
import ImageMarquee from "@/components/marketing/ImageMarquee";
import FaqSection from "@/components/marketing/FaqSection";
import CtaSection from "@/components/marketing/CtaSection";
import Footer from "@/components/marketing/Footer";

export default function Landing() {
  return (
    <div className="relative overflow-hidden">
      {/* Noise texture overlay - hidden on mobile for performance */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none hidden md:block"
        style={{ zIndex: 9999, opacity: 0.04, mixBlendMode: "multiply" as const }}
      >
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>

      <FloatingHeader />
      <HeroSection />
      <ImageMarquee />
      <FaqSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
