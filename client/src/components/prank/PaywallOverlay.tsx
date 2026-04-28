import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Ban, Flame, Loader2, Unlock, Zap } from "lucide-react";
import { authFetch } from "@/lib/api";
import { posthog } from "@/lib/posthog";
import { useTranslation } from "react-i18next";

interface PaywallOverlayProps {
  imageUrl: string;
  isFake?: boolean;
}

export function PaywallOverlay({ imageUrl, isFake }: PaywallOverlayProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [monthlyPranksCount, setMonthlyPranksCount] = useState(12847);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    posthog.capture("paywall_view", { isFake: !!isFake });
  }, [isFake]);

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
    posthog.capture("checkout_initiated", { isFake: !!isFake });
    try {
      const res = await authFetch("/api/stripe/create-checkout", {
        method: "POST",
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

  return (
    <div className="relative rounded-2xl overflow-hidden w-full max-w-sm mx-auto h-[min(65vh,600px)] aspect-[9/16] shadow-xl">

      {/* Watermarked/Blurred image or generic blurred background */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={t("paywall.imageAlt")}
          className={`absolute inset-0 w-full h-full object-cover origin-center ${isFake ? "blur-[40px] brightness-50 scale-125" : ""}`}
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

      {/* Centered lock message */}
      <div className="absolute inset-x-0 top-[47%] z-10 -translate-y-1/2 flex flex-col items-center px-6 text-center pointer-events-none">
        <h2 className="font-display text-2xl font-bold text-white text-center">
          {t("paywall.title")}
        </h2>
        <p className="text-sm text-white/70 text-center mt-1">
          {t("paywall.subtitle")} 🔒
        </p>
      </div>

      {/* Card pinned at the bottom */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
        className="absolute bottom-0 left-0 right-0 z-20 p-5 pt-3 flex flex-col items-center"
      >
        {/* Benefits */}
        <ul className="space-y-2.5 mb-6 w-full mt-2">
          <li className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border border-rose-300/25 bg-rose-500/20">
              <Ban className="h-4 w-4 text-rose-300" />
            </div>
            <p className="text-[15px] font-bold text-white leading-none">
              {t("paywall.benefits.noWatermark")}
            </p>
          </li>

          <li className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border border-amber-300/25 bg-amber-500/20">
              <Zap className="h-4 w-4 text-amber-300" />
            </div>
            <p className="text-[15px] font-bold text-white leading-none">
              {t("paywall.benefits.instantResult")}
            </p>
          </li>

          <li className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border border-orange-300/25 bg-orange-500/20">
              <Flame className="h-4 w-4 text-orange-300" />
            </div>
            <p className="text-[15px] font-bold text-white leading-none">
              {t("paywall.benefits.allTemplates")}
            </p>
          </li>
        </ul>

        <p className="text-sm text-white/80 mb-3 text-center">
          {t("paywall.monthlySent", {
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
          className={`relative w-full overflow-hidden ring-1 ring-primary/70 flex items-center justify-center font-bold tracking-tight text-primary-foreground text-base py-4 rounded-full bg-primary transform-gpu cursor-pointer select-none transition-[filter,opacity] hover:brightness-110 active:brightness-95 disabled:opacity-70 disabled:cursor-not-allowed ${!isLoading ? "paywall-cta-pulse" : ""}`}
        >
          {isLoading ? (
            <span className="paywall-cta-label-stable flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("common.actions.redirecting")}
            </span>
          ) : (
            <span className="paywall-cta-label-stable flex items-center justify-center gap-2">
              <Unlock className="w-4 h-4" strokeWidth={3} />
              {t("paywall.unlockCta")}
            </span>
          )}
        </motion.button>

        {/* Price line */}
        <p className="text-xs text-white/50 mt-2.5 text-center">
          {t("paywall.priceLine")}
        </p>
      </motion.div>
    </div>
  );
}
