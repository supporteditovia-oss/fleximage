import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  getPaywallPlanCards,
  resolveBillingCurrency,
  type PlanCardPrice,
} from "@shared/billing";
import type { PaywallPlan } from "@/components/larp/PaywallOverlay";

const PLAN_CARD_META: Record<
  PaywallPlan,
  { bonusKey?: string; featureKeys: string[]; popular?: boolean }
> = {
  discovery: {
    featureKeys: ["photo", "realistic", "hd", "history", "support"],
  },
  essential: {
    bonusKey: "essentialBonus",
    featureKeys: ["photo", "marketRealism", "details", "video", "prioritySupport"],
  },
  ultimate: {
    popular: true,
    featureKeys: [
      "photo",
      "video",
      "voiceIncluded",
      "indistinguishable",
      "ulDetails",
      "immersion",
      "vipSupport",
    ],
  },
};

export type PaywallPlanCard = {
  id: PaywallPlan;
  price: PlanCardPrice;
  bonusKey?: string;
  featureKeys: string[];
  popular?: boolean;
};

export function usePaywallPlanCards(): PaywallPlanCard[] {
  const { i18n } = useTranslation();
  const currency = resolveBillingCurrency(i18n.language);

  return useMemo(
    () =>
      getPaywallPlanCards(currency).map((card) => ({
        ...card,
        ...PLAN_CARD_META[card.id],
      })),
    [currency],
  );
}

export function getCheckoutLocale(language: string): string {
  return resolveBillingCurrency(language) === "usd" ? "en" : "fr";
}
