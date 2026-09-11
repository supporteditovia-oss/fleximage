import { useEffect } from "react";
import { useLocation } from "wouter";
import { Clock3, Gem, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LuxePaywallModal } from "@/components/generate/LuxePaywallModal";
import { BlurredLockedVoice } from "@/components/generate/BlurredLockedVoice";
import { useAuth } from "@/hooks/use-auth";
import { formatCredits } from "@/lib/format-locale";
import { usePaywallPreviewPage } from "@/hooks/use-paywall-preview-page";

export default function VoixPrete() {
  const [location] = useLocation();
  const { profile, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const {
    userPrompt,
    expired,
    hydrated,
    paywallOpen,
    setPaywallOpen,
    countdownLabel,
    isUrgent,
    purgeExpiredPreview,
  } = usePaywallPreviewPage("voice", profile?.id);

  const credits = profile?.credits ?? 0;
  const creditsLabel = formatCredits(credits, i18n.resolvedLanguage);

  useEffect(() => {
    const params = new URLSearchParams(
      typeof window !== "undefined"
        ? window.location.search
        : location.includes("?")
          ? location.split("?")[1] || ""
          : "",
    );
    if (params.get("paywall") === "1" && !expired && userPrompt) {
      setPaywallOpen(true);
    }
  }, [location, expired, userPrompt, setPaywallOpen]);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex items-center justify-end gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
        {!expired ? (
          <button
            type="button"
            onClick={() => setPaywallOpen(true)}
            className="pointer-events-auto flex max-w-[46%] shrink-0 items-center gap-1 rounded-lg border border-[var(--lx-gold)]/35 bg-[var(--lx-surface-2)]/95 px-2.5 py-1.5 text-sm font-semibold text-[var(--lx-ink)] shadow-sm backdrop-blur-xl sm:max-w-none sm:gap-1.5 sm:px-3"
          >
            <Gem className="h-4 w-4 shrink-0 text-[var(--lx-gold)] sm:h-5 sm:w-5" strokeWidth={1.75} />
            <span className="min-w-0 truncate tabular-nums">{creditsLabel}</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void signOut()}
          className="pointer-events-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--lx-gold)]/35 bg-[var(--lx-surface-2)]/95 px-2.5 py-1.5 text-sm font-semibold text-[var(--lx-ink)] shadow-sm backdrop-blur-xl sm:px-3"
        >
          <LogOut className="h-4 w-4 shrink-0 text-[var(--lx-muted)]" />
          <span className="hidden sm:inline">{t("layout.dock.signOut")}</span>
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] sm:min-h-[calc(100svh-6rem)] sm:justify-center sm:pb-8 sm:pt-14">
        {!hydrated ? (
          <div className="flex min-h-[40vh] w-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--lx-gold)] border-t-transparent" />
          </div>
        ) : expired ? (
          <>
            <header className="w-full text-center">
              <h1 className="lx-display text-3xl font-semibold tracking-tight text-[var(--lx-ink)] md:text-4xl">
                {t("paywall.previewExpiredTitle")}
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--lx-muted)]">
                {t("paywall.previewExpiredHint")}
              </p>
            </header>
            <button
              type="button"
              onClick={() => {
                purgeExpiredPreview();
                window.location.href = "/create";
              }}
              className="lx-btn-gold inline-flex min-h-12 w-full max-w-md items-center justify-center rounded-full px-8 text-sm font-semibold"
            >
              {t("paywall.previewCreateNew")}
            </button>
          </>
        ) : (
          <>
            <header className="w-full text-center">
              <h1 className="lx-display text-3xl font-semibold tracking-tight text-[var(--lx-ink)] md:text-4xl">
                Ton vocal est prêt
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--lx-muted)]">
                Débloque pour écouter et partager ton audio IA.
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
            >
              <Clock3 className={`h-4 w-4 shrink-0 ${isUrgent ? "text-red-600" : "text-[var(--lx-gold)]"}`} />
              <span className="tabular-nums">{t("paywall.previewDeleteIn", { time: countdownLabel })}</span>
            </div>

            <BlurredLockedVoice prompt={userPrompt} size="page" className="w-full max-w-[280px]" />

            <button
              type="button"
              onClick={() => setPaywallOpen(true)}
              className="lx-btn-gold inline-flex min-h-12 w-full max-w-md items-center justify-center rounded-full px-8 text-sm font-semibold"
            >
              Débloquer mon vocal
            </button>

            <LuxePaywallModal
              open={paywallOpen}
              onOpenChange={setPaywallOpen}
              prompt={userPrompt}
              defaultPlan="essential"
            />
          </>
        )}
      </div>
    </>
  );
}
