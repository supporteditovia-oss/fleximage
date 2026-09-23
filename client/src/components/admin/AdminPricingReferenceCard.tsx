import { ADMIN_PRICING_REFERENCE } from "@shared/pricing-admin-reference";
import { Coins, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

export function AdminPricingReferenceCard() {
  const { t } = useTranslation();
  const b = ADMIN_PRICING_REFERENCE.creditBurn;

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--lx-gold)]/35 bg-[var(--lx-surface-2)]/95 backdrop-blur">
      <div className="flex items-start gap-3 px-4 py-3.5">
        <Coins className="mt-0.5 h-4.5 w-4.5 shrink-0 text-muted-foreground/60" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium">
            {t("settings.admin.pricingTitle")}
          </p>
          <p className="text-[11px] leading-4 text-muted-foreground/55">
            {t("settings.admin.pricingDescription")}
          </p>
        </div>
      </div>
      <div className="space-y-4 border-t border-[var(--lx-ink)]/8 px-4 py-3.5 text-[11px] text-muted-foreground/80">
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50">
            {t("settings.admin.pricingBurnTitle")}
          </p>
          <ul className="space-y-1 font-medium text-[var(--lx-ink)]/90">
            <li>
              {t("settings.admin.pricingBurn.image", { credits: b.image })}
            </li>
            <li>
              {t("settings.admin.pricingBurn.videoI2V", { credits: b.videoI2V })}
            </li>
            <li>
              {t("settings.admin.pricingBurn.videoVoiceExtra", {
                extra: b.videoVoiceExtra,
                total: b.videoI2VWithVoice,
              })}
            </li>
            <li>
              {t("settings.admin.pricingBurn.videoV2V", { credits: b.videoV2V })}
            </li>
            <li>
              {t("settings.admin.pricingBurn.voiceMinute", {
                credits: b.voicePerMinute,
              })}
            </li>
            <li>
              {t("settings.admin.pricingBurn.voiceClone", {
                credits: b.voiceClone,
              })}
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50">
            {t("settings.admin.pricingSubsTitle")}
          </p>
          <ul className="space-y-1">
            {ADMIN_PRICING_REFERENCE.subscriptions.map((sub) => (
              <li key={sub.id} className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="font-medium text-[var(--lx-ink)]/90">
                  {sub.label}
                  {sub.recommended ? (
                    <Sparkles className="ml-1 inline h-3 w-3 text-[var(--lx-gold)]" />
                  ) : null}
                </span>
                <span>
                  {sub.priceLabel} · {sub.creditsPerMonth}{" "}
                  {t("billing.creditsShort")}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50">
            {t("settings.admin.pricingPacksTitle")}
          </p>
          <ul className="space-y-1">
            {ADMIN_PRICING_REFERENCE.creditPacks.map((pack) => (
              <li key={pack.id}>
                <span className="font-medium text-[var(--lx-ink)]/90">
                  {pack.label}
                </span>{" "}
                — {pack.priceLabel} · {pack.credits} {t("billing.creditsShort")}
              </li>
            ))}
          </ul>
        </div>
        <p className="rounded-lg bg-muted/40 px-2.5 py-2 text-[10px] leading-4 text-muted-foreground/65">
          {ADMIN_PRICING_REFERENCE.prodBillingNote}
        </p>
      </div>
    </div>
  );
}
