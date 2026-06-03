import { useQuery } from "@tanstack/react-query";
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

export interface CurrentPlanSummary {
  credits: number;
  planType: CurrentPlanType;
  subscriptionStatus: string;
  isSubscriber: boolean;
  creditsPerCycle: number | null;
  billingInterval: BillingInterval | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canManageSubscription: boolean;
}

export const currentPlanQueryKey = ["stripe", "current-plan"] as const;

export function useCurrentPlan(options: { enabled?: boolean } = {}) {
  return useQuery<CurrentPlanSummary>({
    queryKey: currentPlanQueryKey,
    queryFn: async () => {
      const res = await authFetch(api.stripe.currentPlan.path);
      return (await res.json()) as CurrentPlanSummary;
    },
    enabled: options.enabled ?? true,
    staleTime: 10_000,
  });
}
