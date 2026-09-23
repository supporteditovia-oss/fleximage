/**
 * Catalogue LuxeFlexIA v2 — préparé, non branché Stripe tant que PRICING_V2_ENABLED ≠ 1.
 * Packs : €/crédit > Essentiel (~0,0208 €/cr) pour garder l’abo comme meilleure offre.
 */

import {
  IMAGE_CREDIT_COST,
  VIDEO_I2V_CREDIT_COST,
  VIDEO_V2V_CREDIT_COST,
  VOICE_CLONE_CREDIT_COST,
  VOICE_CREDIT_COST,
} from "./credit-costs";

export const PRICING_CATALOG_V2 = {
  version: "v2" as const,

  subscriptions: [
    {
      id: "discovery" as const,
      name: "Découverte",
      priceTtcCents: 990,
      creditsPerMonth: 250,
      quotas: {
        images: 25,
        videoI2V: 0,
        videoV2V: 0,
        audioMinutes: 0,
        voiceClones: 0,
      },
    },
    {
      id: "essential" as const,
      name: "Essentiel",
      priceTtcCents: 2490,
      creditsPerMonth: 1200,
      recommended: true,
      quotas: {
        images: 70,
        videoI2V: 3,
        videoV2V: 0,
        audioMinutes: 5,
        voiceClones: 1,
      },
    },
    {
      id: "ultimate" as const,
      name: "Ultimate",
      priceTtcCents: 4990,
      creditsPerMonth: 2850,
      quotas: {
        images: 150,
        videoI2V: 10,
        videoV2V: 5,
        audioMinutes: 15,
        voiceClones: 3,
      },
    },
  ],

  /**
   * 3 recharges universelles (image 10 cr · clone 30 · I2V 60 · V2V 95 · voix 10/min).
   * Mini ≥ 1 clip I2V + marge images — perçu « ok » sans égaler l’abo Essentiel (~0,021 €/cr).
   */
  creditPacks: {
    eur: [
      {
        id: "mini" as const,
        tier: "small" as const,
        envKey: "STRIPE_PACK_V2_MINI_PRICE_ID",
        credits: 90,
        amountCents: 349,
        label: "Boost Mini",
        priceLabel: "3,49 €",
      },
      {
        id: "standard" as const,
        tier: "medium" as const,
        envKey: "STRIPE_PACK_V2_STANDARD_PRICE_ID",
        credits: 210,
        amountCents: 799,
        label: "Boost Standard",
        priceLabel: "7,99 €",
      },
      {
        id: "plus" as const,
        tier: "large" as const,
        envKey: "STRIPE_PACK_V2_PLUS_PRICE_ID",
        credits: 450,
        amountCents: 1499,
        label: "Boost Plus",
        priceLabel: "14,99 €",
      },
    ],
    usd: [
      {
        id: "mini" as const,
        tier: "small" as const,
        envKey: "STRIPE_PACK_V2_MINI_PRICE_ID_USD",
        credits: 90,
        amountCents: 399,
        label: "Boost Mini",
        priceLabel: "$3.99",
      },
      {
        id: "standard" as const,
        tier: "medium" as const,
        envKey: "STRIPE_PACK_V2_STANDARD_PRICE_ID_USD",
        credits: 210,
        amountCents: 899,
        label: "Boost Standard",
        priceLabel: "$8.99",
      },
      {
        id: "plus" as const,
        tier: "large" as const,
        envKey: "STRIPE_PACK_V2_PLUS_PRICE_ID_USD",
        credits: 450,
        amountCents: 1699,
        label: "Boost Plus",
        priceLabel: "$16.99",
      },
    ],
  },

  planStripeEnvKeys: {
    eur: {
      discovery: "STRIPE_DISCOVERY_V2_PRICE_ID",
      essential: "STRIPE_ESSENTIAL_V2_PRICE_ID",
      ultimate: "STRIPE_ULTIMATE_V2_PRICE_ID",
    },
    usd: {
      discovery: "STRIPE_DISCOVERY_V2_PRICE_ID_USD",
      essential: "STRIPE_ESSENTIAL_V2_PRICE_ID_USD",
      ultimate: "STRIPE_ULTIMATE_V2_PRICE_ID_USD",
    },
  },
} as const;

export type CreditPackV2Id =
  (typeof PRICING_CATALOG_V2.creditPacks.eur)[number]["id"];
export type CreditPackTier = "small" | "medium" | "large";

export function packUsageHints(credits: number) {
  const images = Math.floor(credits / IMAGE_CREDIT_COST);
  const videoI2v = Math.floor(credits / VIDEO_I2V_CREDIT_COST);
  const videoV2v = Math.floor(credits / VIDEO_V2V_CREDIT_COST);
  const voiceMinutes = Math.floor(credits / VOICE_CREDIT_COST);
  const voiceClones = Math.floor(credits / VOICE_CLONE_CREDIT_COST);
  return { images, videoI2v, videoV2v, voiceMinutes, voiceClones };
}

export function essentialEurPerCredit(): number {
  const ess = PRICING_CATALOG_V2.subscriptions.find((s) => s.id === "essential");
  if (!ess) return 0.021;
  return ess.priceTtcCents / 100 / ess.creditsPerMonth;
}

/** €/cr pack — doit rester > essentialEurPerCredit pour inciter à l’abo. */
export function packEurPerCredit(amountCents: number, credits: number): number {
  return amountCents / 100 / credits;
}
