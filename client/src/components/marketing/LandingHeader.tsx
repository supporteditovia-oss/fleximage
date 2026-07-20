import * as React from "react";
import { Link } from "wouter";
import { Menu, X, Gem } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { BrandMark } from "@/components/BrandMark";

function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 min-h-12 ${className}`}
      aria-label="LuxeFlexIA — accueil"
    >
      <Gem
        className="h-5 w-5 shrink-0 text-[var(--lx-gold)]"
        strokeWidth={1.75}
        aria-hidden
      />
      <BrandMark className="text-xl font-semibold tracking-tight text-[var(--lx-ink)] md:text-2xl" />
    </Link>
  );
}

export default function LandingHeader() {
  const { user, isLoading } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-[var(--lx-surface)]/90 backdrop-blur-xl">
      <div className="lx-header-inner mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:h-[4.25rem] md:px-6">
        <BrandLogo className="lx-brand" />

        <div className="lx-header-actions flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            {!isLoading && user ? (
              <Link
                href="/app"
                className="lx-btn-gold inline-flex min-h-12 items-center rounded-full px-5 text-sm font-semibold"
              >
                Ouvrir l&apos;appli
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center rounded-full px-4 text-sm font-medium text-[var(--lx-muted)] transition-colors hover:text-[var(--lx-ink)]"
                >
                  Se connecter
                </Link>
                <Link
                  href="/register"
                  className="lx-btn-gold inline-flex min-h-12 items-center rounded-full px-5 text-sm font-semibold"
                >
                  Créer un compte
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-12 w-12 items-center justify-center rounded-lg text-[var(--lx-ink)] sm:hidden"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-black/5 bg-[var(--lx-surface)] px-4 py-4 sm:hidden">
          <div className="flex flex-col gap-2">
            {!isLoading && user ? (
              <Link
                href="/app"
                className="lx-btn-gold inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold"
                onClick={() => setMenuOpen(false)}
              >
                Ouvrir l&apos;appli
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-full px-4 text-sm font-medium text-[var(--lx-muted)]"
                  onClick={() => setMenuOpen(false)}
                >
                  Se connecter
                </Link>
                <Link
                  href="/register"
                  className="lx-btn-gold inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold"
                  onClick={() => setMenuOpen(false)}
                >
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
