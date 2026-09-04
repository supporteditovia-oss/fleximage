import { toUiLocale, type UiLocale } from "./locales";

export type BillingCurrency = "eur" | "usd";
export type BillingPlan = "discovery" | "essential" | "ultimate";
export type CreditPackId = "mini" | "standard" | "plus";

export const DEFAULT_BILLING_CURRENCY: BillingCurrency = "eur";

/** Resolve checkout/display currency from UI locale or explicit override. */
export function resolveBillingCurrency(
  locale: string | null | undefined,
  market?: string | null,
): BillingCurrency {
  const marketNorm = String(market || "")
    .trim()
    .toLowerCase();
  if (marketNorm === "us" || marketNorm === "usd") return "usd";
  if (marketNorm === "eu" || marketNorm === "eur" || marketNorm === "fr") {
    return "eur";
  }
  return toUiLocale(locale) === "en" ? "usd" : "eur";
}

export type PlanCardPrice = {
  prefix: string;
  major: string;
  minor: string;
  showCurrencyCode: boolean;
};

const PLAN_CARD_PRICES: Record<
  BillingCurrency,
  Record<BillingPlan, PlanCardPrice>
> = {
  eur: {
    discovery: { prefix: "", major: "8", minor: "90", showCurrencyCode: true },
    essential: { prefix: "", major: "19", minor: "90", showCurrencyCode: true },
    ultimate: { prefix: "", major: "39", minor: "90", showCurrencyCode: true },
  },
  usd: {
    discovery: { prefix: "$", major: "9", minor: "99", showCurrencyCode: false },
    essential: { prefix: "$", major: "19", minor: "99", showCurrencyCode: false },
    ultimate: { prefix: "$", major: "39", minor: "99", showCurrencyCode: false },
  },
};

export function getPlanCardPrice(
  plan: BillingPlan,
  currency: BillingCurrency,
): PlanCardPrice {
  return PLAN_CARD_PRICES[currency][plan];
}

export function getPaywallPlanCards(currency: BillingCurrency) {
  return (["discovery", "essential", "ultimate"] as const).map((id) => ({
    id,
    price: getPlanCardPrice(id, currency),
  }));
}

export function formatPlanPriceInline(
  plan: BillingPlan,
  currency: BillingCurrency,
): string {
  const p = getPlanCardPrice(plan, currency);
  if (currency === "usd") {
    return `${p.prefix}${p.major}.${p.minor}`;
  }
  return `${p.major},${p.minor} €`;
}

export function billingLocaleParam(locale: string | null | undefined): UiLocale {
  return toUiLocale(locale);
}
