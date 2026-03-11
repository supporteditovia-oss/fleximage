import FloatingHeader from "@/components/layout/FloatingHeader";
import HeroSection from "@/components/marketing/HeroSection";
import ImageMarquee from "@/components/marketing/ImageMarquee";
import FaqSection from "@/components/marketing/FaqSection";
import CtaSection from "@/components/marketing/CtaSection";
import Footer from "@/components/marketing/Footer";

const FLOATING_EMOJIS = [
  { emoji: "😈", top: "18%", left: "3%", delay: "0s", duration: "8s" },
  { emoji: "⚡", top: "45%", right: "4%", delay: "1.5s", duration: "9s" },
  { emoji: "🎭", top: "72%", left: "5%", delay: "3s", duration: "7s" },
  { emoji: "🔥", top: "88%", right: "6%", delay: "0.5s", duration: "8.5s" },
];

export default function Landing() {
  return (
    <div className="bg-background relative overflow-hidden">
      {/* Noise texture overlay */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 9999, opacity: 0.04, mixBlendMode: "multiply" as const }}
      >
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>

      {/* Floating emojis */}
      {FLOATING_EMOJIS.map((e, i) => (
        <div
          key={i}
          className="fixed pointer-events-none select-none emoji-float"
          style={{
            top: e.top,
            left: e.left,
            right: (e as any).right,
            fontSize: "2rem",
            opacity: 0.08,
            zIndex: 0,
            animationDelay: e.delay,
            animationDuration: e.duration,
          }}
        >
          {e.emoji}
        </div>
      ))}

      <FloatingHeader />
      <HeroSection />
      <ImageMarquee />
      <FaqSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
