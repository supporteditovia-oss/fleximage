import { useMemo, useState } from "react";
import { Gem, Loader2, Sparkles, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  createCheckoutSession,
  createPackCheckoutSession,
  createUpgradeCheckoutSession,
  type CheckoutPlan,
  type CreditPackId,
} from "@/lib/stripe";
import type { CurrentPlanSummary } from "@/hooks/use-billing";
import { BrandMark } from "@/components/BrandMark";

type UpgradeOffer = NonNullable<CurrentPlanSummary["upgradeOffers"]>[number];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: CurrentPlanSummary | null | undefined;
};

/**
 * Shown when a subscriber hits 0 credits.
 * Discovery → Essential + Ultimate
 * Essential → Ultimate
 * Ultimate → packs only
 */
export function ZeroCreditsModal({ open, onOpenChange, plan }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const upgrades = useMemo((): UpgradeOffer[] => {
    if (plan?.upgradeOffers && plan.upgradeOffers.length > 0) {
      return plan.upgradeOffers;
    }
    if (plan?.upgradeOffer) return [plan.upgradeOffer];
    return [];
  }, [plan?.upgradeOffer, plan?.upgradeOffers]);

  const packs = useMemo(
    () => (plan?.creditPacks || []).filter((p) => p.available !== false),
    [plan?.creditPacks],
  );

  const redirect = async (url: string | null) => {
    if (!url) {
      toast({
        variant: "destructive",
        title: t("zeroCredits.paymentUnavailableTitle"),
        description: t("zeroCredits.paymentUnavailableDescription"),
      });
      return;
    }
    window.location.href = url;
  };

  const onUpgrade = async (targetPlan: CheckoutPlan) => {
    setLoading(`upgrade:${targetPlan}`);
    try {
      const url = await createUpgradeCheckoutSession(targetPlan);
      await redirect(url);
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("zeroCredits.upgradeFailed"),
        description:
          err instanceof Error ? err.message : t("zeroCredits.retrySoon"),
      });
    } finally {
      setLoading(null);
    }
  };

  const onPack = async (packId: CreditPackId) => {
    setLoading(packId);
    try {
      const url = await createPackCheckoutSession(packId);
      await redirect(url);
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("zeroCredits.packFailed"),
        description:
          err instanceof Error ? err.message : t("zeroCredits.retrySoon"),
      });
    } finally {
      setLoading(null);
    }
  };

  const onSubscribeFresh = async (planId: CheckoutPlan) => {
    setLoading(planId);
    try {
      const url = await createCheckoutSession(planId);
      await redirect(url);
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("zeroCredits.subscribeFailed"),
        description:
          err instanceof Error ? err.message : t("zeroCredits.retrySoon"),
      });
    } finally {
      setLoading(null);
    }
  };

  const isSubscriber = Boolean(plan?.isSubscriber);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[min(100%,420px)] overflow-y-auto border-[var(--lx-gold)]/30 bg-[var(--lx-surface)] p-0 sm:rounded-2xl [&>button]:z-30 [&>button]:border [&>button]:border-[var(--lx-gold)]/30 [&>button]:bg-white">
        <div className="relative px-5 pb-6 pt-5">

          <div className="mb-4 flex items-center gap-2 text-[var(--lx-ink)]">
            <Gem className="h-5 w-5 text-[var(--lx-gold)]" strokeWidth={1.75} />
            <BrandMark className="text-base font-semibold" />
          </div>

          <DialogTitle className="text-xl font-semibold tracking-tight text-[var(--lx-ink)]">
            {t("zeroCredits.title")}
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm text-[var(--lx-ink-muted)]">
            {t("zeroCredits.description")}
          </DialogDescription>

          {isSubscriber && upgrades.length > 0 ? (
            <div className="mt-5 space-y-3">
              {upgrades.map((upgrade, index) => {
                const isRecommended =
                  upgrade.recommended !== false && index === 0;
                return (
                  <div
                    key={upgrade.plan}
                    className={
                      isRecommended
                        ? "rounded-2xl border border-[var(--lx-gold)]/45 bg-gradient-to-br from-[#f8f1dc] to-[#fff] p-4 shadow-sm"
                        : "rounded-2xl border border-black/10 bg-white/60 p-4"
                    }
                  >
                    {isRecommended ? (
                      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--lx-gold)]/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a6a12]">
                        <Sparkles className="h-3 w-3" />
                        {t("zeroCredits.recommended")}
                      </div>
                    ) : null}
                    <h3 className="text-lg font-semibold text-[var(--lx-ink)]">
                      {t(`zeroCredits.upgrade.${upgrade.plan}.headline`, {
                        defaultValue: upgrade.headline,
                      })}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--lx-ink-muted)]">
                      {t(`zeroCredits.upgrade.${upgrade.plan}.pitch`, {
                        defaultValue: upgrade.pitch,
                      })}
                    </p>
                    <p className="mt-2 text-sm font-medium text-[var(--lx-ink)]">
                      {t("zeroCredits.perMonth", {
                        credits: t(
                          `zeroCredits.upgrade.${upgrade.plan}.creditsLabel`,
                          { defaultValue: upgrade.creditsLabel },
                        ),
                        price: upgrade.priceLabel,
                      })}
                    </p>
                    <button
                      type="button"
                      disabled={loading !== null}
                      onClick={() =>
                        void onUpgrade(upgrade.plan as CheckoutPlan)
                      }
                      className={
                        isRecommended
                          ? "lx-btn-gold mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold disabled:opacity-70"
                          : "mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-black/12 bg-white py-3 text-sm font-semibold text-[var(--lx-ink)] disabled:opacity-70"
                      }
                    >
                      {loading === `upgrade:${upgrade.plan}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      {t(`zeroCredits.upgrade.${upgrade.plan}.cta`, {
                        defaultValue: upgrade.cta,
                      })}
                    </button>
                  </div>
                );
              })}
              <p className="text-center text-[11px] text-[var(--lx-ink-muted)]">
                {t("zeroCredits.replacePlan")}
              </p>
            </div>
          ) : !isSubscriber ? (
            <div className="mt-5 space-y-2">
              <button
                type="button"
                disabled={loading !== null}
                onClick={() => void onSubscribeFresh("essential")}
                className="lx-btn-gold flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold"
              >
                {loading === "essential" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {t("zeroCredits.subscribeEssential")}
              </button>
              <button
                type="button"
                disabled={loading !== null}
                onClick={() => void onSubscribeFresh("discovery")}
                className="flex w-full items-center justify-center rounded-full border border-black/10 py-2.5 text-sm font-medium text-[var(--lx-ink)]"
              >
                {t("zeroCredits.subscribeDiscovery")}
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--lx-ink-muted)]">
              {t("zeroCredits.alreadyUltimate")}
            </p>
          )}

          {isSubscriber && packs.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--lx-ink-muted)]">
                {t("zeroCredits.packsTitle")}
              </p>
              <div className="space-y-2">
                {packs.map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    disabled={loading !== null || pack.available === false}
                    onClick={() => void onPack(pack.id as CreditPackId)}
                    className="flex w-full items-center justify-between rounded-xl border border-black/8 bg-white/70 px-3.5 py-3 text-left transition hover:border-[var(--lx-gold)]/40 disabled:opacity-60"
                  >
                    <span className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-[var(--lx-gold)]" />
                      <span>
                        <span className="block text-sm font-semibold text-[var(--lx-ink)]">
                          {pack.label}
                        </span>
                        <span className="block text-xs text-[var(--lx-ink-muted)]">
                          {t("zeroCredits.packLine", {
                            credits: pack.credits,
                            images: pack.images,
                          })}
                        </span>
                      </span>
                    </span>
                    <span className="text-sm font-bold tabular-nums text-[var(--lx-ink)]">
                      {loading === pack.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        pack.priceLabel
                      )}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-[10px] leading-snug text-[var(--lx-ink-muted)]">
                {t("zeroCredits.packsNote")}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
