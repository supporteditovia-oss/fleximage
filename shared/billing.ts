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

export const PLAN_MONTHLY_CREDITS: Record<BillingPlan, number> = {
  discovery: 250,
  essential: 1200,
  ultimate: 2850,
};

const CREDIT_PACK_PRICES: Record<
  BillingCurrency,
  Record<CreditPackId, PlanCardPrice>
> = {
  eur: {
    mini: { prefix: "", major: "3", minor: "49", showCurrencyCode: true },
    standard: { prefix: "", major: "7", minor: "99", showCurrencyCode: true },
    plus: { prefix: "", major: "14", minor: "99", showCurrencyCode: true },
  },
  usd: {
    mini: { prefix: "$", major: "3", minor: "49", showCurrencyCode: false },
    standard: { prefix: "$", major: "7", minor: "99", showCurrencyCode: false },
    plus: { prefix: "$", major: "14", minor: "99", showCurrencyCode: false },
  },
};

export const CREDIT_PACK_CREDITS: Record<CreditPackId, number> = {
  mini: 90,
  standard: 210,
  plus: 450,
};

const PLAN_CARD_PRICES: Record<
  BillingCurrency,
  Record<BillingPlan, PlanCardPrice>
> = {
  eur: {
    discovery: { prefix: "", major: "9", minor: "90", showCurrencyCode: true },
    essential: { prefix: "", major: "24", minor: "90", showCurrencyCode: true },
    ultimate: { prefix: "", major: "49", minor: "90", showCurrencyCode: true },
  },
  usd: {
    discovery: { prefix: "$", major: "9", minor: "99", showCurrencyCode: false },
    essential: { prefix: "$", major: "24", minor: "99", showCurrencyCode: false },
    ultimate: { prefix: "$", major: "49", minor: "99", showCurrencyCode: false },
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
    credits: PLAN_MONTHLY_CREDITS[id],
  }));
}

export function getCreditPackCards(currency: BillingCurrency) {
  return (["mini", "standard", "plus"] as const).map((id) => ({
    id,
    price: CREDIT_PACK_PRICES[currency][id],
    credits: CREDIT_PACK_CREDITS[id],
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

export function formatCreditPackPriceInline(
  pack: CreditPackId,
  currency: BillingCurrency,
): string {
  const p = CREDIT_PACK_PRICES[currency][pack];
  return currency === "usd"
    ? `${p.prefix}${p.major}.${p.minor}`
    : `${p.major},${p.minor} €`;
}

export function billingLocaleParam(locale: string | null | undefined): UiLocale {
  return toUiLocale(locale);
}
