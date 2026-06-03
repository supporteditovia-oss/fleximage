import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Loader2,
  Lock,
  Unlock,
} from "lucide-react";
import { authFetch } from "@/lib/api";
import { useTranslation } from "react-i18next";

export type PaywallPlan = "discovery" | "essential" | "ultimate";

type PlanCard = {
  id: PaywallPlan;
  euros: string;
  cents: string;
  bonusKey?: string;
  featureKeys: string[];
};

const planCards: PlanCard[] = [
  {
    id: "discovery",
    euros: "8",
    cents: "90",
    featureKeys: ["photo", "realistic", "video", "hd", "history", "support"],
  },
  {
    id: "essential",
    euros: "19",
    cents: "90",
    bonusKey: "essentialBonus",
    featureKeys: ["photo", "marketRealism", "details", "video", "prioritySupport"],
  },
  {
    id: "ultimate",
    euros: "39",
    cents: "90",
    featureKeys: ["photo", "indistinguishable", "video", "ulDetails", "immersion", "vipSupport"],
  },
];

interface PaywallOverlayProps {
  imageUrl: string;
  isFake?: boolean;
  defaultPlan?: PaywallPlan;
  initialChoosingPlan?: boolean;
  presentation?: "overlay" | "modal";
  variant?: "default" | "insufficientCredits";
}

export function PaywallOverlay({
  imageUrl,
  isFake,
  defaultPlan = "essential",
  initialChoosingPlan = false,
  presentation = "overlay",
  variant = "default",
}: PaywallOverlayProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isChoosingPlan, setIsChoosingPlan] = useState(initialChoosingPlan);
  const [selectedPlan, setSelectedPlan] = useState<PaywallPlan>(defaultPlan);
  const { t } = useTranslation();

  useEffect(() => {
    setSelectedPlan(defaultPlan);
    setIsChoosingPlan(initialChoosingPlan);
    setIsLoading(false);
  }, [defaultPlan, imageUrl, initialChoosingPlan]);

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
    } catch (error) {
      console.error("Checkout error:", error);
    }
    setIsLoading(false);
  };

  const handlePrimaryAction = () => {
    if (!isChoosingPlan) {
      setIsChoosingPlan(true);
      return;
    }

    void handleSubscribe();
  };

  const isInsufficientCredits = variant === "insufficientCredits";
  const overlaySubtitle = isInsufficientCredits
    ? t("generate.insufficientCreditsTitle")
    : t("paywall.subtitle");
  const overlayTitle = isInsufficientCredits
    ? t("generate.insufficientCreditsDescription")
    : t("paywall.title");
  const primaryCta = isInsufficientCredits
    ? t("paywall.creditsCta")
    : t("paywall.unlockCta");
  const textBlockClassName = isInsufficientCredits
    ? "absolute left-6 right-6 top-[48%] z-20 flex flex-col items-center text-center"
    : "absolute bottom-[116px] left-6 right-6 z-20 flex flex-col items-center text-center";
  const lockClassName = isInsufficientCredits
    ? "absolute left-1/2 top-[34%] z-20 -translate-x-1/2 -translate-y-1/2"
    : "absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2";
  const ctaClassName = isInsufficientCredits
    ? "paywall-credits-cta-border group relative mt-5 flex w-full transform-gpu cursor-pointer select-none items-center justify-center overflow-hidden rounded-full border border-sky-200/80 bg-white py-3.5 text-sm font-bold tracking-tight text-slate-950 shadow-[0_12px_34px_rgba(14,165,233,0.18)] ring-1 ring-sky-300/45 transition-[filter,opacity,box-shadow] hover:brightness-105 hover:shadow-[0_14px_40px_rgba(14,165,233,0.24)] active:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
    : "group relative flex w-full transform-gpu cursor-pointer select-none items-center justify-center overflow-hidden rounded-full bg-primary py-3.5 text-sm font-bold tracking-tight text-primary-foreground ring-1 ring-primary/70 transition-[filter,opacity] hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-70";
  const ctaIconClassName = isInsufficientCredits
    ? "h-4 w-4 text-sky-500"
    : "h-4 w-4";

  if (isChoosingPlan) {
    const isModalPresentation = presentation === "modal";
    const shellClassName = isModalPresentation
      ? "flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-white text-foreground"
      : "flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border border-border/80 bg-white px-3 py-3 text-foreground shadow-2xl shadow-black/10 backdrop-blur-xl md:px-4 md:py-4";
    const innerClassName =
      "mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col";
    const headerClassName = isModalPresentation
      ? "shrink-0 px-4 pb-2 pt-3 text-center sm:px-14"
      : "flex shrink-0 flex-col gap-2 px-1 pb-2 text-center";
    const gridWrapperClassName =
      "min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-2 md:px-0";
    const gridClassName =
      "grid grid-cols-1 gap-5 pt-1 md:grid-cols-3 md:gap-3 md:pt-0";
    const footerClassName =
      "flex shrink-0 justify-center border-t border-border/50 bg-white/95 px-4 pt-3 backdrop-blur-sm pb-[max(1rem,env(safe-area-inset-bottom))]";

    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={shellClassName}
      >
        <div className={innerClassName}>
          <div className={headerClassName}>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {t("paywall.chooseTitle")}
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold leading-none text-foreground md:text-3xl">
                {t("paywall.pricingTitle")}
              </h2>
            </div>
          </div>

          <div className={gridWrapperClassName}>
            <div className={gridClassName}>
            {planCards.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const visibleFeatures = plan.featureKeys.slice(0, 4);

              return (
                <div
                  key={plan.id}
                  className={`relative ${plan.id === "essential" ? "mt-3 md:mt-0" : ""}`}
                >
                  {plan.id === "essential" && (
                    <span className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/15 bg-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-background shadow-sm">
                      {t("paywall.planBadges.recommended")}
                    </span>
                  )}
                <motion.button
                  type="button"
                  onClick={() => setSelectedPlan(plan.id)}
                  whileTap={{ scale: 0.985 }}
                  className={`relative flex min-h-0 w-full flex-col overflow-hidden rounded-lg border p-3 text-left transition-all md:p-4 ${
                    plan.id === "essential" ? "pt-5 md:pt-6" : ""
                  } ${
                    isSelected
                      ? "border-foreground/80 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_18px_45px_rgba(0,0,0,0.10)]"
                      : "border-border/70 bg-muted/25 hover:border-foreground/25 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl font-bold leading-none md:text-2xl">
                        {t(`paywall.plans.${plan.id}.name`)}
                      </h3>
                      <p className="mt-2 text-xs font-semibold text-muted-foreground line-through">
                        {t(`paywall.plans.${plan.id}.oldPrice`)}
                      </p>
                    </div>

                    {isSelected && (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-end gap-1">
                    <span className="font-display text-5xl font-bold leading-[0.86] tracking-normal md:text-6xl">
                      {plan.euros}
                    </span>
                    <span className="pb-1 text-xl font-bold leading-none text-muted-foreground md:text-2xl">
                      {plan.cents}
                    </span>
                    <span className="pb-1 text-sm font-bold leading-none text-muted-foreground">
                      {t("paywall.currency")}
                    </span>
                    <span className="pb-1 text-xs font-bold leading-none text-muted-foreground">
                      {t("paywall.perMonthShort")}
                    </span>
                  </div>

                  <div className="mt-3 rounded-lg border border-border/70 bg-muted/35 p-3">
                    <p className="text-lg font-bold leading-tight md:text-xl">
                      {t(`paywall.plans.${plan.id}.creditsPerMonth`)}
                    </p>
                    <p className="mt-2 text-[11px] font-bold leading-snug text-foreground/75">
                      {t("paywall.generationCosts")}
                    </p>
                    {plan.bonusKey && (
                      <span className="mt-2 inline-flex rounded-full border border-sky-400/25 bg-sky-400/10 px-2 py-1 text-[10px] font-bold text-sky-700">
                        {t(`paywall.planBonuses.${plan.bonusKey}`)}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 min-h-0 flex-1 overflow-hidden">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {t("paywall.includedTitle")}
                    </p>
                    <ul className="mt-2 space-y-1.5 text-xs font-semibold leading-snug text-foreground/78 md:text-sm">
                      {visibleFeatures.map((feature) => (
                        <li key={feature} className="flex gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" strokeWidth={3} />
                          <span>{t(`paywall.planFeatures.${feature}`)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.button>
                </div>
              );
            })}
            </div>
          </div>

          <div className={footerClassName}>
            <motion.button
              onClick={handleSubscribe}
              disabled={isLoading}
              whileTap={!isLoading ? { scale: 0.97, y: 1 } : undefined}
              className="group relative flex min-h-11 w-full max-w-md items-center justify-center overflow-hidden rounded-full bg-foreground px-7 text-sm font-bold text-background ring-1 ring-foreground/20 transition-[filter,opacity] hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("common.actions.redirecting")}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {t("paywall.checkoutCta")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={3} />
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }
  return (
    <div className="relative mx-auto h-[min(92%,620px)] max-h-full min-h-0 w-full max-w-[360px] self-center overflow-hidden rounded-lg shadow-xl">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={t("paywall.imageAlt")}
          className={`absolute inset-0 h-full w-full origin-center object-cover ${
            isFake ? "scale-125 blur-[24px] brightness-50" : ""
          }`}
        />
      ) : (
        <div
          className="absolute inset-0 h-full w-full"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--background)) 40%, hsl(var(--muted)) 70%, hsl(var(--primary) / 0.1) 100%)",
            filter: "blur(30px) brightness(0.5)",
            transform: "scale(1.25)",
          }}
        />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-30% to-black/90" />

      <div className={lockClassName}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
          className="flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md"
        >
          <Lock className="h-10 w-10" strokeWidth={2.8} />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.16 }}
        className={textBlockClassName}
      >
        <p className="mb-1 text-center text-[13px] font-bold text-white/75">
          {overlaySubtitle}
        </p>
        <h2 className="text-center font-display text-[22px] font-bold leading-tight text-white">
          {overlayTitle}
        </h2>
        {isInsufficientCredits && (
          <motion.button
            onClick={handlePrimaryAction}
            disabled={isLoading}
            whileTap={!isLoading ? { scale: 0.95, y: 1 } : undefined}
            className={`${ctaClassName} ${
              !isLoading ? "paywall-cta-pulse" : ""
            }`}
          >
            <span className="paywall-cta-label-stable relative z-10 flex items-center justify-center gap-2">
              <Unlock className={ctaIconClassName} strokeWidth={3} />
              {primaryCta}
            </span>
          </motion.button>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
        className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center p-4 pt-2"
      >
        {!isInsufficientCredits && (
          <motion.button
            onClick={handlePrimaryAction}
            disabled={isLoading}
            whileTap={!isLoading ? { scale: 0.95, y: 1 } : undefined}
            className={`${ctaClassName} ${
              !isLoading ? "paywall-cta-pulse" : ""
            }`}
          >
            <span className="paywall-cta-label-stable flex items-center justify-center gap-2">
              <Unlock className={ctaIconClassName} strokeWidth={3} />
              {primaryCta}
            </span>
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
