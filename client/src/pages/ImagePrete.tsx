import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Clock3, Gem, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getPaywallImage, clearPaywallImage } from "@/lib/paywall-image";
import { getPaywallPrompt, clearPaywallPrompt } from "@/lib/paywall-prompt";
import {
  clearPaywallExpiry,
  formatPaywallCountdown,
  getPaywallMsRemaining,
  startPaywallExpiry,
} from "@/lib/paywall-expiry";
import { LuxePaywallModal } from "@/components/generate/LuxePaywallModal";
import { BlurredLockedImage } from "@/components/generate/BlurredLockedImage";
import { markFakePaywallReached } from "@/lib/fake-paywall-state";
import { useAuth } from "@/hooks/use-auth";

function purgeExpiredPreview() {
  clearPaywallImage();
  clearPaywallPrompt();
  clearPaywallExpiry();
}

export default function ImagePrete() {
  const [location] = useLocation();
  const { profile, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [msRemaining, setMsRemaining] = useState(0);
  const [expired, setExpired] = useState(false);
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

  const countdownLabel = formatPaywallCountdown(msRemaining);
  const isUrgent = !expired && msRemaining > 0 && msRemaining <= 60_000;

  useEffect(() => {
    const image = getPaywallImage();
    const prompt = getPaywallPrompt();

    if (!image) {
      setImageUrl(null);
      setUserPrompt(null);
      setExpiresAt(null);
      setMsRemaining(0);
      setExpired(true);
      clearPaywallExpiry();
      return;
    }

    // Fresh 5:00 every visit — never resume a previous countdown.
    const deadline = startPaywallExpiry();
    setImageUrl(image);
    setUserPrompt(prompt);
    setExpiresAt(deadline);
    setMsRemaining(getPaywallMsRemaining(deadline));
    setExpired(false);
  }, []);

  useEffect(() => {
    if (!expiresAt || expired) return;

    const tick = () => {
      const remaining = getPaywallMsRemaining(expiresAt);
      setMsRemaining(remaining);
      if (remaining <= 0) {
        purgeExpiredPreview();
        setImageUrl(null);
        setUserPrompt(null);
        setExpired(true);
        setPaywallOpen(false);
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [expiresAt, expired]);

  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    if (params.get("paywall") === "1" && !expired && imageUrl) {
      setPaywallOpen(true);
    }
  }, [location, expired, imageUrl]);

  useEffect(() => {
    if (profile?.id) {
      markFakePaywallReached(profile.id, "image");
    }
  }, [profile?.id]);

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
        {!expired ? (
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
        ) : null}

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
        {expired ? (
          <>
            <header className="w-full text-center">
              <h1 className="lx-display text-balance text-3xl font-semibold tracking-tight text-[var(--lx-ink)] md:text-4xl">
                Ton image a été supprimée
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-snug text-[var(--lx-muted)] md:text-base">
                Le délai est écoulé. Relance une création pour générer un nouvel
                aperçu.
              </p>
            </header>

            <div className="flex aspect-[9/16] w-full max-w-[280px] items-center justify-center rounded-2xl border border-dashed border-[var(--lx-gold)]/35 bg-[var(--lx-surface-2)]/80 px-6 text-center">
              <p className="text-sm font-medium text-[var(--lx-muted)]">
                Image indisponible
              </p>
            </div>

            <Link
              href="/generate"
              className="lx-btn-gold inline-flex min-h-12 w-full max-w-md items-center justify-center rounded-full px-8 text-sm font-semibold"
            >
              Créer une nouvelle image
            </Link>
          </>
        ) : (
          <>
            <header className="w-full text-center">
              <h1 className="lx-display text-balance text-3xl font-semibold tracking-tight text-[var(--lx-ink)] md:text-4xl">
                Ton image est prête
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-snug text-[var(--lx-muted)] md:text-base">
                {userPrompt
                  ? "On a préparé ton rendu à partir de ta demande. Débloque-le en HD avant qu’il disparaisse."
                  : "Débloque ton rendu en HD avant la fin du délai — sinon l’image est effacée."}
              </p>
            </header>

            <div
              className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold shadow-sm ${
                isUrgent
                  ? "animate-pulse border-red-500/45 bg-red-50 text-red-700"
                  : "border-[var(--lx-gold)]/40 bg-[var(--lx-surface-2)] text-[var(--lx-ink)]"
              }`}
              role="timer"
              aria-live="polite"
              aria-label={`Ton image sera supprimée dans ${countdownLabel}`}
            >
              <Clock3
                className={`h-4 w-4 shrink-0 ${
                  isUrgent ? "text-red-600" : "text-[var(--lx-gold)]"
                }`}
                strokeWidth={2}
                aria-hidden
              />
              <span className="min-w-0">
                Ton image sera supprimée dans{" "}
                <span className="tabular-nums tracking-wide">
                  {countdownLabel}
                </span>
              </span>
            </div>

            <BlurredLockedImage
              imageUrl={imageUrl}
              prompt={userPrompt}
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
              prompt={userPrompt}
              defaultPlan="essential"
            />
          </>
        )}
      </div>
    </>
  );
}
