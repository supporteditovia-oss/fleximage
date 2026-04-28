import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Film, Loader2, Unlock, Zap } from "lucide-react";
import { authFetch } from "@/lib/api";
import { posthog } from "@/lib/posthog";
import { useTranslation } from "react-i18next";

type PaywallPlan = "image" | "video";

interface PaywallOverlayProps {
  imageUrl: string;
  isFake?: boolean;
  defaultPlan?: PaywallPlan;
  upgradeMode?: boolean;
}

export function PaywallOverlay({ imageUrl, isFake, defaultPlan = "video", upgradeMode = false }: PaywallOverlayProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaywallPlan>(defaultPlan);
  const [monthlyPranksCount, setMonthlyPranksCount] = useState(12847);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    posthog.capture("paywall_view", { isFake: !!isFake, default_plan: defaultPlan, selected_plan: defaultPlan, upgrade_mode: upgradeMode });
  }, [isFake, defaultPlan, upgradeMode]);

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
    posthog.capture(upgradeMode ? "upgrade_initiated" : "checkout_initiated", { isFake: !!isFake, plan: selectedPlan });
    try {
      const res = await authFetch(upgradeMode ? "/api/stripe/create-portal" : "/api/stripe/create-checkout", {
        method: "POST",
        body: upgradeMode ? JSON.stringify({ returnPath: "/generate", upgradeTo: "video" }) : JSON.stringify({ plan: selectedPlan }),
      });
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error(upgradeMode ? "Portal error:" : "Checkout error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden w-full max-w-sm mx-auto h-[min(72vh,640px)] min-h-[560px] aspect-[9/16] shadow-xl">

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

      {/* Card pinned at the bottom */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
        className="absolute bottom-0 left-0 right-0 z-20 p-4 pt-2 flex flex-col items-center"
      >
        <div className="mb-3 flex flex-col items-center px-2 text-center -translate-y-5">
          {!upgradeMode && (
            <p className="text-[13px] font-bold text-white/75 text-center mb-1">
              {t("paywall.subtitle")}
            </p>
          )}
          <h2 className="font-display text-[22px] font-bold text-white text-center leading-tight">
            {upgradeMode ? t("paywall.upgradeTitle") : t("paywall.title")}
          </h2>
        </div>

        {upgradeMode ? (
          <ul className="w-full mb-3 -translate-y-3 space-y-2.5 text-left">
            <li className="grid grid-cols-[16px_1fr] items-start gap-2 text-sm font-bold leading-tight text-white/90">
              <Check className="mt-0.5 h-4 w-4 text-emerald-400" strokeWidth={3} />
              <span>{t("paywall.benefits.ultraFast")}</span>
            </li>
            <li className="grid grid-cols-[16px_1fr] items-start gap-2 text-sm font-bold leading-tight text-white/90">
              <Check className="mt-0.5 h-4 w-4 text-emerald-400" strokeWidth={3} />
              <span>{t("paywall.benefits.upTo40Images")}</span>
            </li>
            <li className="grid grid-cols-[16px_1fr] items-start gap-2 text-sm font-bold leading-tight text-white/90">
              <Check className="mt-0.5 h-4 w-4 text-emerald-400" strokeWidth={3} />
              <span>{t("paywall.benefits.videoTemplates")}</span>
            </li>
          </ul>
        ) : (
        <div className="grid grid-cols-2 gap-2.5 w-full mb-3 -translate-y-3">
          <button
            type="button"
            onClick={() => setSelectedPlan("image")}
            className={`rounded-2xl border p-3.5 text-left transition-all ${
              selectedPlan === "image"
                ? "border-primary bg-primary/20 text-white"
                : "border-white/15 bg-white/10 text-white/75 hover:bg-white/15"
            }`}
          >
            <div className="mt-1 flex min-h-[20px] items-center gap-2 text-[15px] font-bold">
              <Zap className="h-4 w-4" />
              {t("paywall.plans.image.name")}
            </div>
            <p className="mt-0.5 text-lg font-black text-white">{t("paywall.plans.image.price")}</p>
            <p className="text-[11px] text-white/65 leading-tight">{t("paywall.plans.image.credits")}</p>
            <ul className="mt-2.5 space-y-2.5">
              <li className="flex items-start gap-1.5 text-[11px] font-bold leading-tight text-white/85">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" strokeWidth={3} />
                {t("paywall.benefits.fast")}
              </li>
              <li className="flex items-start gap-1.5 text-[11px] font-bold leading-tight text-white/85">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" strokeWidth={3} />
                {t("paywall.benefits.upTo20Images")}
              </li>
              <li className="flex items-start gap-1.5 text-[11px] font-bold leading-tight text-white/85">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" strokeWidth={3} />
                {t("paywall.benefits.allTemplates")}
              </li>
            </ul>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPlan("video")}
            className={`relative rounded-2xl border-2 p-3.5 text-left shadow-lg shadow-secondary/15 transition-all ${
              selectedPlan === "video"
                ? "border-secondary bg-primary/20 text-white"
                : "border-secondary/55 bg-white/10 text-white/85 hover:bg-white/15"
            }`}
          >
            <span className="absolute -top-2 right-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-black text-black">
              {t("paywall.plans.video.badge")}
            </span>
            <div className="mt-1 flex min-h-[20px] items-center gap-2 text-[15px] font-bold">
              <Film className="h-4 w-4" />
              {t("paywall.plans.video.name")}
            </div>
            <p className="mt-0.5 text-lg font-black text-white">{t("paywall.plans.video.price")}</p>
            <p className="text-[11px] text-white/65 leading-tight">{t("paywall.plans.video.credits")}</p>
            <ul className="mt-2.5 space-y-2.5">
              <li className="flex items-start gap-1.5 text-[11px] font-bold leading-tight text-white/85">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" strokeWidth={3} />
                {t("paywall.benefits.ultraFast")}
              </li>
              <li className="flex items-start gap-1.5 text-[11px] font-bold leading-tight text-white/85">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" strokeWidth={3} />
                {t("paywall.benefits.upTo40Images")}
              </li>
              <li className="flex items-start gap-1.5 text-[11px] font-bold leading-tight text-white/85">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" strokeWidth={3} />
                {t("paywall.benefits.videoTemplates")}
              </li>
            </ul>
          </button>
        </div>
        )}

        <p className={`${upgradeMode ? "text-[11px] text-white/65" : "text-xs text-white/80"} mb-2 text-center`}>
          {upgradeMode ? t("paywall.upgradeHelper") : t("paywall.monthlySent", {
            count: new Intl.NumberFormat(i18n.resolvedLanguage ?? "fr").format(
              monthlyPranksCount,
            ),
          })}
        </p>

        {/* CTA Button with pulse animation */}
        <motion.button
          onClick={handleSubscribe}
          disabled={isLoading}
          whileTap={!isLoading ? { scale: 0.95, y: 1 } : undefined}
          className={`relative w-full overflow-hidden ring-1 ring-primary/70 flex items-center justify-center font-bold tracking-tight text-primary-foreground text-sm py-3.5 rounded-full bg-primary transform-gpu cursor-pointer select-none transition-[filter,opacity] hover:brightness-110 active:brightness-95 disabled:opacity-70 disabled:cursor-not-allowed ${!isLoading ? "paywall-cta-pulse" : ""}`}
        >
          {isLoading ? (
            <span className="paywall-cta-label-stable flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("common.actions.redirecting")}
            </span>
          ) : (
            <span className="paywall-cta-label-stable flex items-center justify-center gap-2">
              <Unlock className="w-4 h-4" strokeWidth={3} />
              {upgradeMode ? t("paywall.upgradeCta") : t("paywall.unlockCta")}
            </span>
          )}
        </motion.button>

        {/* Price line */}
        <p className="text-[11px] text-white/50 mt-2 text-center leading-tight">
          {selectedPlan === "video" ? t("paywall.plans.video.priceLine") : t("paywall.priceLine")}
        </p>
      </motion.div>
    </div>
  );
}
