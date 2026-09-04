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
      variant === "discovery" ? 250 : variant === "essential" ? 1100 : 2500,
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
          ? "1,100 credits / month (110 images) — much better value than packs."
          : "1 100 crédits / mois (110 images) — bien plus rentable que les packs.",
        cta: isEn
          ? "Upgrade to Essential — $19.99/month"
          : "Passer à Essential — 19,90 €/mois",
        priceLabel: isEn ? "19.99" : "19,90",
        creditsLabel: isEn ? "1,100 credits" : "1 100 crédits",
        recommended: true,
      },
      {
        plan: "ultimate",
        headline: isEn ? "Upgrade to Ultimate" : "Passe en Ultimate",
        pitch: isEn
          ? "2,500 credits / month (250 images). Maximum volume, lowest cost per image."
          : "2 500 crédits / mois (250 images). Le max de volume, moins cher à l’image.",
        cta: isEn
          ? "Upgrade to Ultimate — $39.99/month"
          : "Passer à Ultimate — 39,90 €/mois",
        priceLabel: isEn ? "39.99" : "39,90",
        creditsLabel: isEn ? "2,500 credits" : "2 500 crédits",
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
          ? "2,500 credits / month (250 images). Maximum volume, lowest cost per image."
          : "2 500 crédits / mois (250 images). Le max de volume, moins cher à l’image.",
        cta: isEn
          ? "Upgrade to Ultimate — $39.99/month"
          : "Passer à Ultimate — 39,90 €/mois",
        priceLabel: isEn ? "39.99" : "39,90",
        creditsLabel: isEn ? "2,500 credits" : "2 500 crédits",
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
