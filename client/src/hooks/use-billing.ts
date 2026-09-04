import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { billingLocaleParam } from "@shared/billing";
import { api } from "@shared/routes";
import { authFetch } from "@/lib/api";

export type CurrentPlanType =
  | "free"
  | "admin"
  | "unknown"
  | "discovery"
  | "essential"
  | "ultimate";

export type BillingInterval = "week" | "month";
export type BillingCurrency = "eur" | "usd";

export interface CurrentPlanSummary {
  credits: number;
  planType: CurrentPlanType;
  subscriptionStatus: string;
  isSubscriber: boolean;
  creditsPerCycle: number | null;
  billingInterval: BillingInterval | null;
  billingCurrency?: BillingCurrency;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canManageSubscription: boolean;
  outOfCredits?: boolean;
  upgradeOffer?: {
    plan: "essential" | "ultimate";
    headline: string;
    pitch: string;
    cta: string;
    priceLabel: string;
    creditsLabel: string;
    recommended?: boolean;
  } | null;
  upgradeOffers?: Array<{
    plan: "essential" | "ultimate";
    headline: string;
    pitch: string;
    cta: string;
    priceLabel: string;
    creditsLabel: string;
    recommended?: boolean;
  }>;
  creditPacks?: Array<{
    id: string;
    label: string;
    credits: number;
    priceLabel: string;
    images: number;
    available?: boolean;
  }>;
}

export const currentPlanQueryRoot = ["stripe", "current-plan"] as const;

export function getCurrentPlanQueryKey(locale: string) {
  return [...currentPlanQueryRoot, billingLocaleParam(locale)] as const;
}

export function useCurrentPlan(options: { enabled?: boolean } = {}) {
  const { i18n } = useTranslation();
  const locale = billingLocaleParam(i18n.language);

  return useQuery<CurrentPlanSummary>({
    queryKey: getCurrentPlanQueryKey(locale),
    queryFn: async () => {
      const params = new URLSearchParams({ locale });
      const res = await authFetch(
        `${api.stripe.currentPlan.path}?${params.toString()}`,
      );
      return (await res.json()) as CurrentPlanSummary;
    },
    enabled: options.enabled ?? true,
    staleTime: 10_000,
  });
}
