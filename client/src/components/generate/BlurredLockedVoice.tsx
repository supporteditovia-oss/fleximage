import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatPaywallPromptPreview } from "@/lib/paywall-prompt";

const WAVE = [10, 16, 9, 22, 14, 27, 17, 11, 23, 31, 18, 12, 25, 19, 8, 17, 29, 20, 12, 24];

type BlurredLockedVoiceProps = {
  prompt?: string | null;
  className?: string;
  size?: "page" | "modal";
};

/** Aperçu vocal flouté + cadenas — funnel marketing voix. */
export function BlurredLockedVoice({
  prompt = null,
  className = "",
  size = "page",
}: BlurredLockedVoiceProps) {
  const { t } = useTranslation();
  const isPage = size === "page";
  const lockBox = isPage ? "h-16 w-16" : "h-10 w-10";
  const lockIcon = isPage ? "h-7 w-7" : "h-4 w-4";
  const promptPreview = prompt?.trim()
    ? formatPaywallPromptPreview(prompt, isPage ? 120 : 60)
    : null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[var(--lx-gold)]/45 bg-[var(--lx-surface-2)] shadow-[0_20px_50px_rgba(18,16,14,0.14)] ${className}`}
    >
      <div className="relative flex aspect-[9/16] w-full flex-col items-center justify-center gap-4 overflow-hidden px-6 py-8">
        <div
          className="flex h-24 w-full max-w-[220px] items-end justify-center gap-1 opacity-40 blur-[2px]"
          aria-hidden
        >
          {WAVE.map((h, i) => (
            <span
              key={i}
              className="w-1.5 rounded-full bg-[var(--lx-gold)]"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>

        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,16,14,0.12)_0%,rgba(18,16,14,0.55)_100%)]"
          aria-hidden
        />

        <div className="relative flex flex-col items-center gap-3">
          <div
            className={`flex ${lockBox} items-center justify-center rounded-full border border-[var(--lx-gold)]/60 bg-[linear-gradient(135deg,#1a1408_0%,#2a2214_100%)] shadow-[0_10px_28px_rgba(18,16,14,0.4)]`}
          >
            <Lock
              className={`${lockIcon} text-[var(--lx-gold-soft)]`}
              strokeWidth={2.25}
              aria-hidden
            />
          </div>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lx-muted)]">
            {t("paywall.lockedVoiceLabel", { defaultValue: "Vocal IA prêt" })}
          </p>
        </div>

        {promptPreview ? (
          <div className="relative z-[1] w-full rounded-xl border border-white/15 bg-black/45 px-3 py-2.5 text-left shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-md">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--lx-gold-soft)]">
              Ton texte
            </p>
            <p className="mt-0.5 text-xs font-medium leading-snug text-white/95">
              « {promptPreview} »
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
