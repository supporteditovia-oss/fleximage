import { Link } from "wouter";
import { Gem } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { LanguageSwitch } from "@/components/layout/LanguageSwitch";

type LandingV2HeaderProps = {
  userLoggedIn?: boolean;
};

/** Overlay header — stays out of the way of the full-bleed image. */
export function LandingV2Header({ userLoggedIn }: LandingV2HeaderProps) {
  return (
    <header className="landing-v2-header">
      <div className="landing-v2-header__side">
        <LanguageSwitch compact className="border-white/15 bg-black/35 text-white shadow-none" />
      </div>
      <Link
        href={userLoggedIn ? "/create" : "/"}
        className="landing-v2-header__logo"
      >
        <Gem className="h-4 w-4 text-[var(--lx-gold)]" strokeWidth={1.75} aria-hidden />
        <BrandMark className="text-base font-semibold text-white sm:text-lg" />
      </Link>
      <div className="landing-v2-header__side landing-v2-header__side--right">
        {userLoggedIn ? (
          <Link href="/create" className="landing-v2-header__cta">
            Studio
          </Link>
        ) : (
          <>
            <Link href="/login" className="landing-v2-header__link">
              Connexion
            </Link>
            <Link href="/register" className="landing-v2-header__cta">
              Créer
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
