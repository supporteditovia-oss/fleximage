import { Link } from "wouter";
import { BrandMark } from "@/components/BrandMark";
import { BeforeAfterSlider } from "@/components/v2/BeforeAfterSlider";
import type { LandingComparePair } from "@/lib/landing-v2-pairs";

type LandingV2HeroProps = {
  pair: LandingComparePair;
  userLoggedIn?: boolean;
};

/** First viewport = image only. Copy sits in a docked band at the bottom. */
export function LandingV2Hero({ pair, userLoggedIn }: LandingV2HeroProps) {
  const ctaHref = userLoggedIn ? "/create" : "/register";
  const ctaLabel = userLoggedIn ? "Ouvrir le studio" : "Créer la tienne";

  return (
    <section className="landing-v2-hero">
      <BeforeAfterSlider
        pair={pair}
        autoPlay
        priority
        className="landing-v2-hero__compare"
        sizes="100vw"
        label="Glisser pour comparer original et rendu IA"
      />
      <div className="landing-v2-hero__dock">
        <BrandMark className="landing-v2-hero__brand text-white" />
        <h1 className="landing-v2-hero__title">Donne vie à ce que tu imagines.</h1>
        <p className="landing-v2-hero__subtitle">
          Une photo. Un rendu qui paraît vécu.
        </p>
        <Link href={ctaHref} className="lx-btn-gold landing-v2-hero__cta">
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
