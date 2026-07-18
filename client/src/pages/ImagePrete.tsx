import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Gem, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getPaywallImage } from "@/lib/paywall-image";
import { LuxePaywallModal } from "@/components/generate/LuxePaywallModal";
import { BlurredLockedImage } from "@/components/generate/BlurredLockedImage";
import { markFakePaywallReached } from "@/lib/fake-paywall-state";
import { useAuth } from "@/hooks/use-auth";

export default function ImagePrete() {
  const [location] = useLocation();
  const { profile, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const credits = profile?.credits ?? 0;
  const creditsLabel = useMemo(() => {
    if (credits < 100_000) {
      return credits.toLocaleString(i18n.resolvedLanguage ?? "fr");
    }
    return new Intl.NumberFormat(i18n.resolvedLanguage ?? "fr", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(credits);
  }, [credits, i18n.resolvedLanguage]);

  useEffect(() => {
    setImageUrl(getPaywallImage());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    if (params.get("paywall") === "1") {
      setPaywallOpen(true);
    }
  }, [location]);

  useEffect(() => {
    if (profile?.id) {
      markFakePaywallReached(profile.id, "image");
    }
  }, [profile?.id]);

  // Hide global header + bottom dock, but keep page scroll on mobile
  useLayoutEffect(() => {
    document.body.setAttribute("data-hide-app-chrome", "true");
    return () => {
      document.body.removeAttribute("data-hide-app-chrome");
    };
  }, []);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex items-center justify-end gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
        <button
          type="button"
          onClick={() => setPaywallOpen(true)}
          className={`pointer-events-auto flex max-w-[46%] shrink-0 items-center gap-1 rounded-lg border border-[var(--lx-gold)]/35 bg-[var(--lx-surface-2)]/95 px-2.5 py-1.5 text-sm font-semibold text-[var(--lx-ink)] shadow-sm backdrop-blur-xl transition hover:bg-white sm:max-w-none sm:gap-1.5 sm:px-3 ${
            credits <= 0 ? "credits-zero-attention" : ""
          }`}
          aria-label={t("billing.openCreditsMenu")}
          title={String(credits)}
        >
          <Gem
            className="h-4 w-4 shrink-0 text-[var(--lx-gold)] sm:h-5 sm:w-5"
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="min-w-0 truncate tabular-nums" aria-live="polite">
            {creditsLabel}
          </span>
        </button>

        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          className="pointer-events-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--lx-gold)]/35 bg-[var(--lx-surface-2)]/95 px-2.5 py-1.5 text-sm font-semibold text-[var(--lx-ink)] shadow-sm backdrop-blur-xl transition hover:bg-white disabled:opacity-60 sm:px-3"
          aria-label={t("layout.dock.signOut")}
        >
          <LogOut className="h-4 w-4 shrink-0 text-[var(--lx-muted)]" aria-hidden />
          <span className="hidden sm:inline">{t("layout.dock.signOut")}</span>
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] sm:min-h-[calc(100svh-6rem)] sm:justify-center sm:pb-8 sm:pt-14">
        <header className="w-full text-center">
          <h1 className="lx-display text-balance text-3xl font-semibold tracking-tight text-[var(--lx-ink)] md:text-4xl">
            Ton image est prête
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-snug text-[var(--lx-muted)] md:text-base">
            Débloque ton rendu en HD pour la voir clairement et la télécharger.
          </p>
        </header>

        <BlurredLockedImage
          imageUrl={imageUrl}
          size="page"
          className="w-full max-w-[280px]"
        />

        <button
          type="button"
          onClick={() => setPaywallOpen(true)}
          className="lx-btn-gold inline-flex min-h-12 w-full max-w-md items-center justify-center rounded-full px-8 text-sm font-semibold"
        >
          Débloquer mon image
        </button>

        <LuxePaywallModal
          open={paywallOpen}
          onOpenChange={setPaywallOpen}
          imageUrl={imageUrl}
          defaultPlan="essential"
        />
      </div>
    </>
  );
}
