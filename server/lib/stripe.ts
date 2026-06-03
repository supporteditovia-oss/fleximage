import Stripe from "stripe";

export type StripePlanType = "discovery" | "essential" | "ultimate";
export type LegacyStripePlanType = "weekly" | "monthly" | "image" | "video";
export type StripePlanInput = StripePlanType | LegacyStripePlanType;
export type BillingInterval = "week" | "month";

export interface StripePlanConfig {
  planType: StripePlanType;
  priceId: string;
  creditsPerCycle: number;
  billingInterval: BillingInterval;
  name: string;
  monthlyAmount: number;
}

let _stripe: Stripe | null = null;

const PLAN_DEFINITIONS: Record<
  StripePlanType,
  {
    name: string;
    monthlyAmount: number;
    creditsPerCycle: number;
    envKeys: string[];
    legacyEnvKeys?: string[];
  }
> = {
  discovery: {
    name: "Decouverte",
    monthlyAmount: 890,
    creditsPerCycle: 2500,
    envKeys: ["STRIPE_DISCOVERY_PRICE_ID"],
    legacyEnvKeys: [
      "STRIPE_WEEKLY_PRICE_ID",
      "STRIPE_IMAGE_PRICE_ID",
      "STRIPE_PRICE_ID",
    ],
  },
  essential: {
    name: "Essentiel",
    monthlyAmount: 1990,
    creditsPerCycle: 9500,
    envKeys: ["STRIPE_ESSENTIAL_PRICE_ID"],
    legacyEnvKeys: ["STRIPE_MONTHLY_PRICE_ID", "STRIPE_VIDEO_PRICE_ID"],
  },
  ultimate: {
    name: "Ultimate",
    monthlyAmount: 3990,
    creditsPerCycle: 1_000_000,
    envKeys: ["STRIPE_ULTIMATE_PRICE_ID"],
  },
};

export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY must be set");
  }
  assertStripeKeyAllowedForRuntime(secretKey);

  _stripe = new Stripe(secretKey);
  return _stripe;
}

export function isLiveStripeSecretKey(secretKey: string | undefined): boolean {
  return Boolean(secretKey?.startsWith("sk_live_"));
}

export function isTestStripeSecretKey(secretKey: string | undefined): boolean {
  return Boolean(secretKey?.startsWith("sk_test_"));
}

function isPlaceholderWebhookSecret(secret: string | undefined): boolean {
  return !secret?.trim() || secret.includes("your_") || secret === "whsec_your_stripe_webhook_secret";
}

function assertStripeKeyAllowedForRuntime(secretKey: string): void {
  if (process.env.NODE_ENV === "production" && !isLiveStripeSecretKey(secretKey)) {
    throw new Error("Production Stripe billing must use a live STRIPE_SECRET_KEY");
  }
}

export function validateStripeRuntimeConfig(): void {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY must be set");
  }
  assertStripeKeyAllowedForRuntime(secretKey);

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (process.env.NODE_ENV === "production" && isPlaceholderWebhookSecret(webhookSecret)) {
    throw new Error("Production Stripe billing must use a real STRIPE_WEBHOOK_SECRET");
  }
}

export function getStripePriceId(): string {
  return getStripePriceIdForPlan("essential");
}

export function normalizeStripePlanType(planType: string | null | undefined): StripePlanType {
  if (planType === "ultimate") return "ultimate";
  if (planType === "essential" || planType === "monthly" || planType === "video") {
    return "essential";
  }
  return "discovery";
}

function splitPriceIds(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function getPlanPriceIds(planType: StripePlanType): string[] {
  const definition = PLAN_DEFINITIONS[planType];
  const directIds = definition.envKeys.map((key) => process.env[key]);
  const fallbackIds = (definition.legacyEnvKeys || []).map((key) => process.env[key]);
  const extraLegacyIds =
    planType === "discovery"
      ? [
          ...splitPriceIds(process.env.STRIPE_WEEKLY_LEGACY_PRICE_IDS),
          ...splitPriceIds(process.env.STRIPE_IMAGE_LEGACY_PRICE_IDS),
        ]
      : planType === "essential"
        ? [
            ...splitPriceIds(process.env.STRIPE_MONTHLY_LEGACY_PRICE_IDS),
            ...splitPriceIds(process.env.STRIPE_VIDEO_LEGACY_PRICE_IDS),
          ]
        : [];

  return [
    ...directIds,
    ...fallbackIds,
    ...extraLegacyIds,
  ].filter(Boolean) as string[];
}

function toStripePlanConfig(
  planType: StripePlanType,
  priceId: string,
  billingInterval: BillingInterval = "month",
): StripePlanConfig {
  const definition = PLAN_DEFINITIONS[planType];
  return {
    planType,
    priceId,
    creditsPerCycle: definition.creditsPerCycle,
    billingInterval,
    name: definition.name,
    monthlyAmount: definition.monthlyAmount,
  };
}

export function getStripePlanConfig(planType: StripePlanInput): StripePlanConfig {
  const normalizedPlanType = normalizeStripePlanType(planType);
  const definition = PLAN_DEFINITIONS[normalizedPlanType];
  const isLegacyInput = !["discovery", "essential", "ultimate"].includes(planType);
  const candidateEnvKeys = isLegacyInput
    ? [...definition.envKeys, ...(definition.legacyEnvKeys || [])]
    : definition.envKeys;
  const priceId = candidateEnvKeys
    .map((key) => process.env[key])
    .find(Boolean);

  if (!priceId) {
    throw new Error(`${candidateEnvKeys.join(" or ")} must be set`);
  }

  return toStripePlanConfig(normalizedPlanType, priceId);
}

export function getStripePriceIdForPlan(planType: StripePlanInput): string {
  return getStripePlanConfig(planType).priceId;
}

export function getPlanForPriceId(priceId: string): StripePlanConfig {
  for (const planType of Object.keys(PLAN_DEFINITIONS) as StripePlanType[]) {
    if (!priceId || !getPlanPriceIds(planType).includes(priceId)) continue;
    return toStripePlanConfig(planType, priceId);
  }

  return getStripePlanConfig("discovery");
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET must be set");
  }
  return secret;
}
