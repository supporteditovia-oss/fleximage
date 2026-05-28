import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Loader2,
  Lock,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { authFetch } from "@/lib/api";
import { useTranslation } from "react-i18next";

type PaywallPlan = "weekly" | "monthly";

const socialProofAvatars = [
  { initials: "AM", className: "bg-[radial-gradient(circle_at_30%_25%,#c084fc,#7c3aed_58%,#4c1d95)]" },
  { initials: "JL", className: "bg-[radial-gradient(circle_at_30%_25%,#f9a8d4,#db2777_58%,#831843)]" },
  { initials: "NS", className: "bg-[radial-gradient(circle_at_30%_25%,#67e8f9,#0891b2_58%,#164e63)]" },
  { initials: "MR", className: "bg-[radial-gradient(circle_at_30%_25%,#fdba74,#f97316_58%,#7c2d12)]" },
];

interface PaywallOverlayProps {
  imageUrl: string;
  isFake?: boolean;
  defaultPlan?: PaywallPlan;
}

export function PaywallOverlay({ imageUrl, isFake, defaultPlan = "monthly" }: PaywallOverlayProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isChoosingPlan, setIsChoosingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaywallPlan>(defaultPlan);
  const [monthlyPranksCount, setMonthlyPranksCount] = useState(12847);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    setSelectedPlan(defaultPlan);
    setIsChoosingPlan(false);
    setIsLoading(false);
  }, [defaultPlan, imageUrl]);

  useEffect(() => {
    const baseCount = 12847;
    let timeoutId: number | null = null;
    let cancelled = false;

    const scheduleNextTick = () => {
      if (cancelled) return;

      const isPause = Math.random() < 0.22;
      const delay = isPause
        ? 2800 + Math.floor(Math.random() * 2200)
        : 1200 + Math.floor(Math.random() * 1600);

      timeoutId = window.setTimeout(() => {
        setMonthlyPranksCount((current) => {
          if (isPause) return current;

          const isBurst = Math.random() < 0.16;
          const step = isBurst
            ? 3 + Math.floor(Math.random() * 4)
            : 1 + Math.floor(Math.random() * 2);

          const next = current + step;
          if (next > baseCount + 250) {
            return baseCount + Math.floor(Math.random() * 50);
          }
          return next;
        });

        scheduleNextTick();
      }, delay);
    };

    scheduleNextTick();

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

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
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setIsLoading(false);
    }
  };

  const handlePrimaryAction = () => {
    if (!isChoosingPlan) {
      setIsChoosingPlan(true);
      return;
    }

    handleSubscribe();
  };

  const ctaLabel = isChoosingPlan ? t("paywall.checkoutCta") : t("paywall.unlockCta");
  const formattedPranksCount = new Intl.NumberFormat(
    i18n.resolvedLanguage ?? "fr",
  ).format(monthlyPranksCount);
  const allowanceBenefitKey =
    selectedPlan === "weekly"
      ? "paywall.benefits.weeklyAllowance"
      : "paywall.benefits.monthlyAllowance";

  if (isChoosingPlan) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex h-full max-h-full w-full items-stretch justify-center text-white"
      >
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[440px] flex-col items-center justify-center py-[clamp(1rem,3svh,2rem)]">
          <div className="mb-[clamp(2rem,5svh,3rem)] text-center">
            <h2 className="font-display text-3xl font-black leading-tight md:text-4xl">
              {t("paywall.pricingTitle")}
            </h2>
            <p className="mt-2 text-sm font-medium text-white/60 md:mt-3 md:text-base">
              {t("paywall.pricingSubtitle")}
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-3.5">
            <motion.button
              type="button"
              onClick={() => setSelectedPlan("weekly")}
              className={`relative min-h-[clamp(118px,15svh,136px)] rounded-xl border p-3.5 text-left transition-all ${
                selectedPlan === "weekly"
                  ? "border-primary bg-primary/10 text-white shadow-[0_0_28px_hsl(var(--primary)/0.16)]"
                  : "border-white/12 bg-white/[0.04] text-white/80 hover:bg-white/[0.07]"
              }`}
            >
              <div className="mb-3.5 grid grid-cols-[1fr_16px] items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-wide text-white/45">
                  {t("paywall.plans.weekly.period")}
                </span>
                <Check
                  className={`h-4 w-4 text-primary transition-opacity ${
                    selectedPlan === "weekly" ? "opacity-100" : "opacity-0"
                  }`}
                  strokeWidth={3}
                />
              </div>
              <p className="text-[22px] font-black tracking-tight text-white">
                {t("paywall.plans.weekly.price")}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-white/55">
                {t("paywall.plans.weekly.credits")}
              </p>
            </motion.button>

            <motion.button
              type="button"
              onClick={() => setSelectedPlan("monthly")}
              className={`relative min-h-[clamp(118px,15svh,136px)] rounded-xl border p-3.5 text-left transition-all ${
                selectedPlan === "monthly"
                  ? "border-primary bg-primary/10 text-white shadow-[0_0_28px_hsl(var(--primary)/0.18)]"
                  : "border-white/12 bg-white/[0.04] text-white/80 hover:bg-white/[0.07]"
              }`}
            >
              <span className="absolute right-3 top-0 -translate-y-1/2 rounded-full bg-primary px-2 py-0.5 text-[8px] font-black text-primary-foreground shadow-[0_4px_14px_hsl(var(--primary)/0.28)] sm:px-2.5 sm:text-[9px]">
                {t("paywall.plans.monthly.badge")}
              </span>
              <div className="mb-3.5 grid grid-cols-[1fr_16px] items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-wide text-white/45">
                  {t("paywall.plans.monthly.period")}
                </span>
                <Check
                  className={`h-4 w-4 text-primary transition-opacity ${
                    selectedPlan === "monthly" ? "opacity-100" : "opacity-0"
                  }`}
                  strokeWidth={3}
                />
              </div>
              <p className="text-[22px] font-black tracking-tight text-white">
                {t("paywall.plans.monthly.price")}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-primary">
                {t("paywall.plans.monthly.credits")}
              </p>
            </motion.button>
          </div>

          <ul className="mt-[clamp(1.5rem,3.8svh,2.25rem)] grid w-full grid-cols-2 gap-x-5 gap-y-[clamp(0.75rem,1.8svh,1.125rem)] text-[11px] font-semibold leading-tight text-white/82">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" strokeWidth={3} />
              <span>{t(allowanceBenefitKey)}</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" strokeWidth={3} />
              <span>{t("paywall.benefits.ultraFast")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" strokeWidth={3} />
              <span>{t("paywall.benefits.hyperRealistic")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" strokeWidth={3} />
              <span>{t("paywall.benefits.history")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" strokeWidth={3} />
              <span>{t("paywall.benefits.newTemplates")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" strokeWidth={3} />
              <span>{t("paywall.benefits.prioritySupport")}</span>
            </li>
          </ul>

          <div className="mt-[clamp(2.75rem,6.6svh,4rem)] flex w-full items-center justify-center gap-2.5 text-center">
            <div className="flex shrink-0 -space-x-2" aria-hidden="true">
              {socialProofAvatars.map((avatar) => (
                <span
                  key={avatar.initials}
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[8px] font-black text-white shadow-sm ${avatar.className}`}
                >
                  {avatar.initials}
                </span>
              ))}
            </div>
            <p className="min-w-0 text-[11px] font-black leading-tight text-white/88 sm:text-xs">
              {t("paywall.socialProof")}
            </p>
          </div>

          <motion.button
            onClick={handlePrimaryAction}
            disabled={isLoading}
            whileTap={!isLoading ? { scale: 0.97, y: 1 } : undefined}
            className={`group mt-4 relative w-full overflow-hidden ring-1 ring-primary/70 flex items-center justify-center font-black tracking-tight text-primary-foreground text-sm py-3.5 rounded-xl bg-primary transform-gpu cursor-pointer select-none transition-[filter,opacity] hover:brightness-110 active:brightness-95 disabled:opacity-70 disabled:cursor-not-allowed ${!isLoading ? "paywall-cta-pulse" : ""}`}
          >
            {isLoading ? (
              <span className="paywall-cta-label-stable flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("common.actions.redirecting")}
              </span>
            ) : (
              <span className="paywall-cta-label-stable flex items-center justify-center gap-2">
                {ctaLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={3} />
              </span>
            )}
          </motion.button>

          <p className="mt-[clamp(1rem,2.4svh,1.5rem)] flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-white/48">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.6} />
            {t("paywall.secureLine")}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="relative mx-auto h-[min(92%,620px)] max-h-full min-h-0 w-full max-w-[360px] self-center overflow-hidden rounded-lg shadow-xl">

      {/* Watermarked/Blurred image or generic blurred background */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={t("paywall.imageAlt")}
          className={`absolute inset-0 w-full h-full object-cover origin-center ${isFake ? "blur-[24px] brightness-50 scale-125" : ""}`}
        />
      ) : (
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--background)) 40%, hsl(var(--muted)) 70%, hsl(var(--primary) / 0.1) 100%)",
            filter: "blur(30px) brightness(0.5)",
            transform: "scale(1.25)",
          }}
        />
      )}

      {/* Gradient overlay: transparent top → dark bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-30% to-black/90 pointer-events-none" />

      {!isChoosingPlan && (
        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
            className="flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md"
          >
            <Lock className="h-10 w-10" strokeWidth={2.8} />
          </motion.div>
        </div>
      )}

      {!isChoosingPlan && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.16 }}
          className="absolute bottom-[116px] left-6 right-6 z-20 flex flex-col items-center text-center"
        >
          <p className="mb-1 text-center text-[13px] font-bold text-white/75">
            {t("paywall.subtitle")}
          </p>
          <h2 className="text-center font-display text-[22px] font-bold leading-tight text-white">
            {t("paywall.title")}
          </h2>
        </motion.div>
      )}

      {/* Card pinned at the bottom */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
        className="absolute bottom-0 left-0 right-0 z-20 p-4 pt-2 flex flex-col items-center"
      >
        {/* CTA Button with pulse animation */}
        <motion.button
          onClick={handlePrimaryAction}
          disabled={isLoading}
          whileTap={!isLoading ? { scale: 0.95, y: 1 } : undefined}
          className={`group relative w-full overflow-hidden ring-1 ring-primary/70 flex items-center justify-center font-bold tracking-tight text-primary-foreground text-sm py-3.5 rounded-full bg-primary transform-gpu cursor-pointer select-none transition-[filter,opacity] hover:brightness-110 active:brightness-95 disabled:opacity-70 disabled:cursor-not-allowed ${!isLoading ? "paywall-cta-pulse" : ""}`}
        >
          {isLoading ? (
            <span className="paywall-cta-label-stable flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("common.actions.redirecting")}
            </span>
          ) : (
            <span className="paywall-cta-label-stable flex items-center justify-center gap-2">
              <Unlock className="h-4 w-4" strokeWidth={3} />
              {ctaLabel}
            </span>
          )}
        </motion.button>

        <p className="mt-2 text-center text-xs text-white/80">
          {t("paywall.monthlySent", {
            count: formattedPranksCount,
          })}
        </p>
      </motion.div>
    </div>
  );
}
