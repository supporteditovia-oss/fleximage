import Stripe from "stripe";

export type StripePlanType = "image" | "video";
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
  return getStripePriceIdForPlan("image");
}

export function getStripePlanConfig(planType: StripePlanType): StripePlanConfig {
  if (planType === "image") {
    const priceId = process.env.STRIPE_IMAGE_PRICE_ID || process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      throw new Error("STRIPE_IMAGE_PRICE_ID or STRIPE_PRICE_ID must be set");
    }
    return {
      planType: "image",
      priceId,
      creditsPerCycle: 100,
      billingInterval: "week",
    };
  }

  const priceId = process.env.STRIPE_VIDEO_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_VIDEO_PRICE_ID must be set");
  }
  return {
    planType: "video",
    priceId,
    creditsPerCycle: 200,
    billingInterval: "week",
  };
}

export function getStripePriceIdForPlan(planType: StripePlanType): string {
  return getStripePlanConfig(planType).priceId;
}

export function getPlanForPriceId(priceId: string): StripePlanConfig {
  const videoPriceId = process.env.STRIPE_VIDEO_PRICE_ID;
  if (videoPriceId && priceId === videoPriceId) {
    return getStripePlanConfig("video");
  }
  return getStripePlanConfig("image");
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET must be set");
  }
  return secret;
}
