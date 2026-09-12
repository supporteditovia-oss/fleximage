import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ZeroCreditsModal } from "@/components/generate/ZeroCreditsModal";
import type { CurrentPlanSummary } from "@/hooks/use-billing";
import { resolveBillingCurrency } from "@shared/billing";
import "./generate-page.css";

type PreviewVariant = "discovery" | "essential" | "ultimate";

function buildPreviewPlan(
  variant: PreviewVariant,
  isEn: boolean,
): CurrentPlanSummary {
  const packs = isEn
    ? [
        {
          id: "mini",
          label: "Boost Mini",
          credits: 50,
          priceLabel: "$2.99",
          images: 5,
          available: true,
        },
        {
          id: "standard",
          label: "Boost Standard",
          credits: 120,
          priceLabel: "$5.99",
          images: 12,
          available: true,
        },
        {
          id: "plus",
          label: "Boost Plus",
          credits: 250,
          priceLabel: "$9.99",
          images: 25,
          available: true,
        },
      ]
    : [
        {
          id: "mini",
          label: "Boost Mini",
          credits: 50,
          priceLabel: "2,90 €",
          images: 5,
          available: true,
        },
        {
          id: "standard",
          label: "Boost Standard",
          credits: 120,
          priceLabel: "5,90 €",
          images: 12,
          available: true,
        },
        {
          id: "plus",
          label: "Boost Plus",
          credits: 250,
          priceLabel: "9,90 €",
          images: 25,
          available: true,
        },
      ];

  const base: CurrentPlanSummary = {
    credits: 0,
    planType: variant,
    subscriptionStatus: "active",
    isSubscriber: true,
    creditsPerCycle:
      variant === "discovery" ? 240 : variant === "essential" ? 840 : 1920,
    billingInterval: "month",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    canManageSubscription: true,
    outOfCredits: true,
    creditPacks: packs,
    upgradeOffer: null,
    upgradeOffers: [],
  };

  if (variant === "discovery") {
    base.upgradeOffers = [
      {
        plan: "essential",
        headline: isEn ? "Upgrade to Essential" : "Passe en Essential",
        pitch: isEn
          ? "840 credits / month (70 images or 14 videos) — much better value than packs."
          : "840 crédits / mois (70 images ou 14 vidéos) — bien plus rentable que les packs.",
        cta: isEn
          ? "Upgrade to Essential — $22.99/month"
          : "Passer à Essential — 22,90 €/mois",
        priceLabel: isEn ? "22.99" : "22,90",
        creditsLabel: isEn ? "840 credits" : "840 crédits",
        recommended: true,
      },
      {
        plan: "ultimate",
        headline: isEn ? "Upgrade to Ultimate" : "Passe en Ultimate",
        pitch: isEn
          ? "1,920 credits / month (160 images or 32 videos). Maximum volume, lowest cost per image."
          : "1 920 crédits / mois (160 images ou 32 vidéos). Le max de volume, moins cher à l’image.",
        cta: isEn
          ? "Upgrade to Ultimate — $44.99/month"
          : "Passer à Ultimate — 44,90 €/mois",
        priceLabel: isEn ? "44.99" : "44,90",
        creditsLabel: isEn ? "1,920 credits" : "1 920 crédits",
        recommended: false,
      },
    ];
    base.upgradeOffer = base.upgradeOffers[0];
  } else if (variant === "essential") {
    base.upgradeOffers = [
      {
        plan: "ultimate",
        headline: isEn ? "Upgrade to Ultimate" : "Passe en Ultimate",
        pitch: isEn
          ? "1,920 credits / month (160 images or 32 videos). Maximum volume, lowest cost per image."
          : "1 920 crédits / mois (160 images ou 32 vidéos). Le max de volume, moins cher à l’image.",
        cta: isEn
          ? "Upgrade to Ultimate — $44.99/month"
          : "Passer à Ultimate — 44,90 €/mois",
        priceLabel: isEn ? "44.99" : "44,90",
        creditsLabel: isEn ? "1,920 credits" : "1 920 crédits",
        recommended: true,
      },
    ];
    base.upgradeOffer = base.upgradeOffers[0];
  }

  return base;
}

export default function ZeroCreditsPreview() {
  const { i18n } = useTranslation();
  const [variant, setVariant] = useState<PreviewVariant>("discovery");
  const isEn = resolveBillingCurrency(i18n.resolvedLanguage) === "usd";

  const plan = useMemo(
    () => buildPreviewPlan(variant, isEn),
    [variant, isEn],
  );

  useEffect(() => {
    document.title = isEn
      ? "Preview — Out of credits | LuxeFlexIA"
      : "Preview — Plus de crédits | LuxeFlexIA";
  }, [isEn]);

  return (
    <div className="min-h-screen bg-[var(--lx-surface)] px-4 py-10">
      <div className="mx-auto mb-6 flex max-w-md flex-wrap gap-2">
        {(["discovery", "essential", "ultimate"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setVariant(item)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              variant === item
                ? "bg-[var(--lx-gold)] text-[var(--lx-ink)]"
                : "border border-black/10 bg-white"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <ZeroCreditsModal open onOpenChange={() => {}} plan={plan} />
    </div>
  );
}
