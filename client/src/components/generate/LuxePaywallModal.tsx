import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Lock, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { authFetch } from "@/lib/api";
import type { PaywallPlan } from "@/components/larp/PaywallOverlay";
import { BlurredLockedImage } from "@/components/generate/BlurredLockedImage";
import { useToast } from "@/hooks/use-toast";

type PlanCard = {
  id: PaywallPlan;
  euros: string;
  cents: string;
  bonusKey?: string;
  featureKeys: string[];
  popular?: boolean;
};

const PLAN_CARDS: PlanCard[] = [
  {
    id: "discovery",
    euros: "8",
    cents: "90",
    featureKeys: ["photo", "realistic", "hd", "history", "support"],
  },
  {
    id: "essential",
    euros: "19",
    cents: "90",
    popular: true,
    bonusKey: "essentialBonus",
    featureKeys: ["photo", "marketRealism", "details", "prioritySupport"],
  },
  {
    id: "ultimate",
    euros: "39",
    cents: "90",
    featureKeys: ["photo", "indistinguishable", "ulDetails", "immersion", "vipSupport"],
  },
];

const COMMON_FEATURE_KEYS = ["instantCredits", "monthlyRenewal"] as const;

interface LuxePaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl?: string | null;
  prompt?: string | null;
  defaultPlan?: PaywallPlan;
}

export function LuxePaywallModal({
  open,
  onOpenChange,
  imageUrl,
  prompt = null,
  defaultPlan = "essential",
}: LuxePaywallModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<PaywallPlan>(defaultPlan);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedPlan(defaultPlan);
      setIsLoading(false);
    }
  }, [open, defaultPlan]);

  const selectedPlanCard = useMemo(
    () => PLAN_CARDS.find((plan) => plan.id === selectedPlan) ?? PLAN_CARDS[0],
    [selectedPlan],
  );

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch("/api/stripe/create-checkout", {
        method: "POST",
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
        return;
      }
      toast({
        variant: "destructive",
        title: t("common.messages.error"),
        description: t("paywall.checkoutError"),
      });
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        variant: "destructive",
        title: t("common.messages.error"),
        description:
          error instanceof Error && error.message
            ? error.message
            : t("paywall.checkoutError"),
      });
    }
    setIsLoading(false);
  };

  const bulletClassName =
    "flex items-start gap-1.5 text-[11px] font-medium leading-snug text-[var(--lx-muted)] md:text-xs";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92dvh,40rem)] w-[min(calc(100vw-1.25rem),28rem)] flex-col gap-0 overflow-hidden rounded-3xl border border-[var(--lx-gold)]/30 bg-[var(--lx-surface)] p-0 shadow-[0_24px_80px_rgba(18,16,14,0.28)] sm:rounded-3xl [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-4 [-webkit-overflow-scrolling:touch] touch-pan-y md:px-6 md:pb-6 md:pt-5">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 80% 55% at 50% -10%, rgba(201,162,39,0.22) 0%, transparent 60%)",
            }}
          />

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full text-[var(--lx-muted)] transition-colors hover:bg-black/5 hover:text-[var(--lx-ink)]"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>

          <div className="relative z-10">
            <DialogTitle className="lx-display pr-8 text-center text-2xl font-semibold tracking-tight text-[var(--lx-ink)] md:text-[1.7rem]">
              Débloque ton image en HD
            </DialogTitle>
            <DialogDescription className="mx-auto mt-1.5 max-w-xs text-center text-sm font-medium text-[var(--lx-muted)]">
              Choisis ton plan pour révéler le rendu final.
            </DialogDescription>

            {imageUrl ? (
              <BlurredLockedImage
                imageUrl={imageUrl}
                prompt={prompt}
                size="modal"
                className="mx-auto mt-4 w-24 sm:w-28"
              />
            ) : null}

            <div className="mt-4 grid grid-cols-3 gap-2">
              {PLAN_CARDS.map((plan) => {
                const selected = selectedPlan === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative flex flex-col rounded-2xl border p-2.5 text-left transition-all md:p-3 ${
                      selected
                        ? "border-[var(--lx-gold)] bg-white shadow-[0_10px_28px_rgba(18,16,14,0.1)]"
                        : "border-black/8 bg-[var(--lx-surface-2)]/80 hover:border-[var(--lx-gold)]/40"
                    }`}
                  >
                    {plan.popular ? (
                      <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-[var(--lx-gold)]/55 bg-[linear-gradient(135deg,#1a1408_0%,#2a2214_100%)] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--lx-gold-soft)]">
                        {t("paywall.planBadges.recommended")}
                      </span>
                    ) : null}
                    <span className="lx-display text-[13px] font-semibold text-[var(--lx-ink)]">
                      {t(`paywall.plans.${plan.id}.name`)}
                    </span>
                    <span className="mt-1 flex items-baseline gap-0.5">
                      <span className="text-lg font-bold tracking-tight text-[var(--lx-ink)]">
                        {plan.euros}
                      </span>
                      <span className="text-xs font-semibold text-[var(--lx-muted)]">
                        ,{plan.cents}€
                      </span>
                    </span>
                    <span className="mt-1.5 text-[10px] font-semibold leading-tight text-[var(--lx-muted)]">
                      {t(`paywall.plans.${plan.id}.creditsPerMonth`)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 rounded-2xl border border-black/6 bg-[var(--lx-surface-2)]/95 p-3.5 shadow-[0_10px_30px_rgba(18,16,14,0.06)] md:p-4">
              <p className="lx-display text-sm font-semibold text-[var(--lx-ink)] md:text-base">
                {t("paywall.includedTitle")} —{" "}
                {t(`paywall.plans.${selectedPlanCard.id}.name`)}
              </p>
              <p className="mt-1 text-[11px] font-medium text-[var(--lx-muted)] md:text-xs">
                {t(`paywall.plans.${selectedPlanCard.id}.note`)}
              </p>
              <ul className="mt-3 grid grid-cols-1 gap-2 min-[390px]:grid-cols-2 min-[390px]:gap-x-3 min-[390px]:gap-y-2">
                <li className={bulletClassName}>
                  <Check
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--lx-gold)]"
                    strokeWidth={2.75}
                  />
                  <span>{t(`paywall.plans.${selectedPlanCard.id}.creditsPerMonth`)}</span>
                </li>
                <li className={bulletClassName}>
                  <Check
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--lx-gold)]"
                    strokeWidth={2.75}
                  />
                  <span>{t("paywall.generationCosts")}</span>
                </li>
                {selectedPlanCard.bonusKey ? (
                  <li className={bulletClassName}>
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--lx-gold)]"
                      strokeWidth={2.75}
                    />
                    <span>{t(`paywall.planBonuses.${selectedPlanCard.bonusKey}`)}</span>
                  </li>
                ) : null}
                {selectedPlanCard.featureKeys.map((feature) => (
                  <li key={feature} className={bulletClassName}>
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--lx-gold)]"
                      strokeWidth={2.75}
                    />
                    <span>{t(`paywall.planFeatures.${feature}`)}</span>
                  </li>
                ))}
                {COMMON_FEATURE_KEYS.map((feature) => (
                  <li key={feature} className={bulletClassName}>
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--lx-gold)]"
                      strokeWidth={2.75}
                    />
                    <span>{t(`paywall.planFeatures.${feature}`)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => void handleSubscribe()}
              disabled={isLoading}
              className="lx-btn-gold mt-4 flex min-h-12 w-full items-center justify-center rounded-full px-6 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("common.actions.redirecting")}
                </span>
              ) : (
                t("paywall.checkoutCta")
              )}
            </button>

            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-[var(--lx-muted)]">
              <Lock className="h-3 w-3 text-[var(--lx-gold)]" strokeWidth={2.5} />
              {t("paywall.securePayment")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
