import Stripe from "stripe";

export type StripePlanType = "weekly" | "monthly";
export type LegacyStripePlanType = "image" | "video";
export type StripePlanInput = StripePlanType | LegacyStripePlanType;
export type BillingInterval = "week" | "month";

export interface StripePlanConfig {
  planType: StripePlanType;
  priceId: string;
  creditsPerCycle: number;
  billingInterval: BillingInterval;
}

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY must be set");
  }

  _stripe = new Stripe(secretKey);
  return _stripe;
}

export function getStripePriceId(): string {
  return getStripePriceIdForPlan("weekly");
}

export function normalizeStripePlanType(planType: string | null | undefined): StripePlanType {
  if (planType === "monthly" || planType === "video") return "monthly";
  return "weekly";
}

function splitPriceIds(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function getPlanPriceIds(planType: StripePlanType): string[] {
  if (planType === "monthly") {
    return [
      process.env.STRIPE_MONTHLY_PRICE_ID,
      process.env.STRIPE_VIDEO_PRICE_ID,
      ...splitPriceIds(process.env.STRIPE_MONTHLY_LEGACY_PRICE_IDS),
      ...splitPriceIds(process.env.STRIPE_VIDEO_LEGACY_PRICE_IDS),
    ].filter(Boolean) as string[];
  }

  return [
    process.env.STRIPE_WEEKLY_PRICE_ID,
    process.env.STRIPE_IMAGE_PRICE_ID,
    process.env.STRIPE_PRICE_ID,
    ...splitPriceIds(process.env.STRIPE_WEEKLY_LEGACY_PRICE_IDS),
    ...splitPriceIds(process.env.STRIPE_IMAGE_LEGACY_PRICE_IDS),
  ].filter(Boolean) as string[];
}

export function getStripePlanConfig(planType: StripePlanInput): StripePlanConfig {
  const normalizedPlanType = normalizeStripePlanType(planType);

  if (normalizedPlanType === "weekly") {
    const priceId =
      process.env.STRIPE_WEEKLY_PRICE_ID ||
      process.env.STRIPE_IMAGE_PRICE_ID ||
      process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      throw new Error(
        "STRIPE_WEEKLY_PRICE_ID, STRIPE_IMAGE_PRICE_ID, or STRIPE_PRICE_ID must be set",
      );
    }
    return {
      planType: "weekly",
      priceId,
      creditsPerCycle: 100,
      billingInterval: "week",
    };
  }

  const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
  const priceId = monthlyPriceId || process.env.STRIPE_VIDEO_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_MONTHLY_PRICE_ID or STRIPE_VIDEO_PRICE_ID must be set");
  }
  return {
    planType: "monthly",
    priceId,
    creditsPerCycle: 250,
    billingInterval: monthlyPriceId ? "month" : "week",
  };
}

export function getStripePriceIdForPlan(planType: StripePlanInput): string {
  return getStripePlanConfig(planType).priceId;
}

export function getPlanForPriceId(priceId: string): StripePlanConfig {
  if (priceId && getPlanPriceIds("monthly").includes(priceId)) {
    const monthlyConfig = getStripePlanConfig("monthly");
    const legacyWeeklyMonthlyIds = [
      process.env.STRIPE_VIDEO_PRICE_ID,
      ...splitPriceIds(process.env.STRIPE_VIDEO_LEGACY_PRICE_IDS),
    ].filter(Boolean) as string[];

    return {
      ...monthlyConfig,
      priceId,
      billingInterval:
        process.env.STRIPE_MONTHLY_PRICE_ID &&
        priceId !== process.env.STRIPE_MONTHLY_PRICE_ID &&
        legacyWeeklyMonthlyIds.includes(priceId)
          ? "week"
          : monthlyConfig.billingInterval,
    };
  }

  if (priceId && getPlanPriceIds("weekly").includes(priceId)) {
    return {
      ...getStripePlanConfig("weekly"),
      priceId,
    };
  }

  return getStripePlanConfig("weekly");
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET must be set");
  }
  return secret;
}
