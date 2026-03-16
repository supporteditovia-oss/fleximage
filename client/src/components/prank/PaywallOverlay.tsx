import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Lock } from "lucide-react";
import { authFetch } from "@/lib/api";
import { posthog } from "@/lib/posthog";

interface PaywallOverlayProps {
  imageUrl: string;
  isFake?: boolean;
}

export function PaywallOverlay({ imageUrl, isFake }: PaywallOverlayProps) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    posthog.capture("paywall_view", { isFake: !!isFake });
  }, [isFake]);

  const handleSubscribe = async () => {
    setIsLoading(true);
    posthog.capture("checkout_initiated", { isFake: !!isFake });
    try {
      const res = await authFetch("/api/stripe/create-checkout", {
        method: "POST",
      });
      const { url } = await res.json();
      if (url) {
        // Wait briefly so PostHog has time to send the tracking event before navigation
        await new Promise((resolve) => setTimeout(resolve, 800));
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
          alt="Prank généré"
          className={`absolute inset-0 w-full h-full object-cover origin-center ${isFake ? "blur-[40px] brightness-50 scale-125" : ""}`}
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/60 via-purple-500/60 to-blue-500/60 blur-[40px] scale-125 opacity-60" />
      )}

      {/* Gradient overlay: transparent top → dark bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-30% to-black/90 pointer-events-none" />

      {/* Card pinned at the bottom */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
        className="absolute bottom-0 left-0 right-0 z-20 p-5 pt-3 flex flex-col items-center"
      >
        {/* Title */}
        <h2 className="font-display text-lg font-bold text-white text-center">
          Débloque ton prank !
        </h2>

        {/* Subtitle */}
        <p className="text-sm text-white/70 text-center mt-1 mb-3">
          Ton image est prête mais protégée.
        </p>

        {/* Bullets */}
        <ul className="space-y-1.5 mb-4 w-full">
          {[
            "HD sans filigrane",
            "Générations illimitées",
            "Tous les templates",
          ].map((benefit) => (
            <li key={benefit} className="flex items-center gap-2 text-sm text-white">
              <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-primary" />
              </div>
              {benefit}
            </li>
          ))}
        </ul>

        {/* CTA Button with pulse animation */}
        <button
          onClick={handleSubscribe}
          disabled={isLoading}
          className="w-full flex items-center justify-center font-bold text-primary-foreground text-sm py-3.5 rounded-full bg-primary transition-all hover:brightness-110 active:scale-95 disabled:opacity-70"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirection...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" strokeWidth={3} />
              Débloquer mon prank
            </span>
          )}
        </button>

        {/* Price line */}
        <p className="text-xs text-white/50 mt-2.5 text-center">
          4,90€/semaine · Résiliable à tout moment
        </p>
      </motion.div>
    </div>
  );
}
