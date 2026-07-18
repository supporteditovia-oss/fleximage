import { useEffect } from "react";
import { useLocation } from "wouter";
import { Gem } from "lucide-react";
import {
  getMobileCompatibleLandingImages,
  LANDING_MARQUEE_IMAGES,
} from "@/lib/landing-marquee-images";
import "./welcome.css";

const WELCOME_DURATION_MS = 2500;

const bgImages = getMobileCompatibleLandingImages(LANDING_MARQUEE_IMAGES).slice(
  0,
  4,
);

export default function WelcomeLoader() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      navigate("/generate", { replace: true });
    }, WELCOME_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [navigate]);

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
          <span className="welcome-brand-text">
            Luxe<span className="welcome-brand-accent">Flex</span>IA
          </span>
        </div>
        <div className="welcome-spinner" aria-hidden="true" />
        <p className="welcome-caption">Préparation de ton espace…</p>
      </div>
    </div>
  );
}
