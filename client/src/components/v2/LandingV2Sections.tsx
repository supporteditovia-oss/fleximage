import { Link } from "wouter";
import { BeforeAfterSlider } from "@/components/v2/BeforeAfterSlider";
import type { LandingComparePair } from "@/lib/landing-v2-pairs";

type LandingV2GalleryProps = {
  pairs: LandingComparePair[];
};

/** Pure image stack — no article intros. */
export function LandingV2Gallery({ pairs }: LandingV2GalleryProps) {
  if (pairs.length === 0) return null;

  return (
    <section className="landing-v2-gallery" aria-label="Autres transformations">
      {pairs.map((pair) => (
        <BeforeAfterSlider
          key={pair.id}
          pair={pair}
          autoPlay
          className="landing-v2-gallery__item"
          sizes="100vw"
        />
      ))}
    </section>
  );
}

export function LandingV2Cta({ userLoggedIn }: { userLoggedIn?: boolean }) {
  return (
    <section className="landing-v2-cta">
      <p className="landing-v2-cta__line">
        Ajoute ta photo. Décris la scène. Récupère le rendu.
      </p>
      <Link
        href={userLoggedIn ? "/create" : "/register"}
        className="lx-btn-gold landing-v2-cta__btn"
      >
        {userLoggedIn ? "Ouvrir le studio" : "Commencer"}
      </Link>
    </section>
  );
}

export function LandingV2Footer() {
  return (
    <footer className="landing-v2-footer">
      <p>© {new Date().getFullYear()} LuxeFlexIA</p>
      <div className="landing-v2-footer__links">
        <a href="/cgu">CGU</a>
        <a href="/confidentialite">Confidentialité</a>
        <a href="/mentions-legales">Mentions légales</a>
      </div>
    </footer>
  );
}
