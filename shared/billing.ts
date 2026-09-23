import { toUiLocale, type UiLocale } from "./locales";
import { isPricingV2Enabled } from "./pricing-flags";
import { PRICING_CATALOG_V2 } from "./pricing-catalog-v2";

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

const PLAN_CARD_PRICES_V1: Record<
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

const PLAN_CARD_PRICES_V2: Record<
  BillingCurrency,
  Record<BillingPlan, PlanCardPrice>
> = {
  eur: {
    discovery: { prefix: "", major: "9", minor: "90", showCurrencyCode: true },
    essential: { prefix: "", major: "24", minor: "90", showCurrencyCode: true },
    ultimate: { prefix: "", major: "49", minor: "90", showCurrencyCode: true },
  },
  usd: {
    discovery: { prefix: "$", major: "10", minor: "99", showCurrencyCode: false },
    essential: { prefix: "$", major: "27", minor: "99", showCurrencyCode: false },
    ultimate: { prefix: "$", major: "54", minor: "99", showCurrencyCode: false },
  },
};

function centsToPlanCardPrice(
  cents: number,
  currency: BillingCurrency,
): PlanCardPrice {
  const majorUnits = Math.floor(cents / 100);
  const minor = String(cents % 100).padStart(2, "0");
  if (currency === "usd") {
    return {
      prefix: "$",
      major: String(majorUnits),
      minor,
      showCurrencyCode: false,
    };
  }
  return {
    prefix: "",
    major: String(majorUnits),
    minor,
    showCurrencyCode: true,
  };
}

export function getPlanCardPrice(
  plan: BillingPlan,
  currency: BillingCurrency,
): PlanCardPrice {
  if (isPricingV2Enabled()) {
    const sub = PRICING_CATALOG_V2.subscriptions.find((s) => s.id === plan);
    if (sub) return centsToPlanCardPrice(sub.priceTtcCents, currency);
    return PLAN_CARD_PRICES_V2[currency][plan];
  }
  return PLAN_CARD_PRICES_V1[currency][plan];
}

const PLAN_CREDITS_V1: Record<BillingPlan, number> = {
  discovery: 250,
  essential: 1100,
  ultimate: 2500,
};

export function getPlanCreditsPerMonth(plan: BillingPlan): number {
  if (isPricingV2Enabled()) {
    const sub = PRICING_CATALOG_V2.subscriptions.find((s) => s.id === plan);
    return sub?.creditsPerMonth ?? PLAN_CREDITS_V1[plan];
  }
  return PLAN_CREDITS_V1[plan];
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
