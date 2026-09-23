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

  /** Recharges one-shot — crédits universels sauf packs « focus » (UI). */
  creditPacks: {
    eur: [
      {
        id: "flash",
        envKey: "STRIPE_PACK_V2_FLASH_PRICE_ID",
        credits: 45,
        amountCents: 349,
        label: "Boost Flash",
        priceLabel: "3,49 €",
        useCase: "image" as const,
        badge: "Image",
      },
      {
        id: "creator",
        envKey: "STRIPE_PACK_V2_CREATOR_PRICE_ID",
        credits: 110,
        amountCents: 790,
        label: "Boost Créateur",
        priceLabel: "7,90 €",
        useCase: "any" as const,
        badge: "Mix",
      },
      {
        id: "studio",
        envKey: "STRIPE_PACK_V2_STUDIO_PRICE_ID",
        credits: 240,
        amountCents: 1490,
        label: "Boost Studio",
        priceLabel: "14,90 €",
        useCase: "any" as const,
        badge: "Volume",
      },
      {
        id: "clip",
        envKey: "STRIPE_PACK_V2_CLIP_PRICE_ID",
        credits: VIDEO_I2V_CREDIT_COST,
        amountCents: 499,
        label: "Boost Clip 5 s",
        priceLabel: "4,99 €",
        useCase: "video" as const,
        badge: "Vidéo",
      },
      {
        id: "voice",
        envKey: "STRIPE_PACK_V2_VOICE_PRICE_ID",
        credits: 40,
        amountCents: 449,
        label: "Boost Voix",
        priceLabel: "4,49 €",
        useCase: "voice" as const,
        badge: "Voix",
      },
    ],
    usd: [
      {
        id: "flash",
        envKey: "STRIPE_PACK_V2_FLASH_PRICE_ID_USD",
        credits: 45,
        amountCents: 399,
        label: "Flash Boost",
        priceLabel: "$3.99",
        useCase: "image" as const,
        badge: "Image",
      },
      {
        id: "creator",
        envKey: "STRIPE_PACK_V2_CREATOR_PRICE_ID_USD",
        credits: 110,
        amountCents: 899,
        label: "Creator Boost",
        priceLabel: "$8.99",
        useCase: "any" as const,
        badge: "Mix",
      },
      {
        id: "studio",
        envKey: "STRIPE_PACK_V2_STUDIO_PRICE_ID_USD",
        credits: 240,
        amountCents: 1699,
        label: "Studio Boost",
        priceLabel: "$16.99",
        useCase: "any" as const,
        badge: "Volume",
      },
      {
        id: "clip",
        envKey: "STRIPE_PACK_V2_CLIP_PRICE_ID_USD",
        credits: VIDEO_I2V_CREDIT_COST,
        amountCents: 549,
        label: "5 s Clip Boost",
        priceLabel: "$5.49",
        useCase: "video" as const,
        badge: "Video",
      },
      {
        id: "voice",
        envKey: "STRIPE_PACK_V2_VOICE_PRICE_ID_USD",
        credits: 40,
        amountCents: 499,
        label: "Voice Boost",
        priceLabel: "$4.99",
        useCase: "voice" as const,
        badge: "Voice",
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

export type CreditPackUseCase = "any" | "image" | "voice" | "video";
export type CreditPackV2Id =
  (typeof PRICING_CATALOG_V2.creditPacks.eur)[number]["id"];

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
