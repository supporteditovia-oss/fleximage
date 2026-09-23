/**
 * Miroir serveur de shared/pricing-catalog-v2.ts (sans build TS côté API).
 */
const {
  IMAGE_CREDIT_COST,
  VOICE_CREDIT_COST,
  VOICE_CLONE_CREDIT_COST,
  VIDEO_I2V_CREDIT_COST,
  VIDEO_V2V_CREDIT_COST,
} = require("./credit-costs");

const PRICING_CATALOG_V2 = {
  version: "v2",
  subscriptions: [
    {
      id: "discovery",
      name: "Découverte",
      priceTtcCents: 990,
      creditsPerMonth: 250,
    },
    {
      id: "essential",
      name: "Essentiel",
      priceTtcCents: 2490,
      creditsPerMonth: 1200,
      recommended: true,
    },
    {
      id: "ultimate",
      name: "Ultimate",
      priceTtcCents: 4990,
      creditsPerMonth: 2850,
    },
  ],
  creditPacks: {
    eur: [
      {
        id: "flash",
        envKey: "STRIPE_PACK_V2_FLASH_PRICE_ID",
        credits: 45,
        amountCents: 349,
        label: "Boost Flash",
        priceLabel: "3,49 €",
        useCase: "image",
        badge: "Image",
      },
      {
        id: "creator",
        envKey: "STRIPE_PACK_V2_CREATOR_PRICE_ID",
        credits: 110,
        amountCents: 790,
        label: "Boost Créateur",
        priceLabel: "7,90 €",
        useCase: "any",
        badge: "Mix",
      },
      {
        id: "studio",
        envKey: "STRIPE_PACK_V2_STUDIO_PRICE_ID",
        credits: 240,
        amountCents: 1490,
        label: "Boost Studio",
        priceLabel: "14,90 €",
        useCase: "any",
        badge: "Volume",
      },
      {
        id: "clip",
        envKey: "STRIPE_PACK_V2_CLIP_PRICE_ID",
        credits: VIDEO_I2V_CREDIT_COST,
        amountCents: 499,
        label: "Boost Clip 5 s",
        priceLabel: "4,99 €",
        useCase: "video",
        badge: "Vidéo",
      },
      {
        id: "voice",
        envKey: "STRIPE_PACK_V2_VOICE_PRICE_ID",
        credits: 40,
        amountCents: 449,
        label: "Boost Voix",
        priceLabel: "4,49 €",
        useCase: "voice",
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
        useCase: "image",
        badge: "Image",
      },
      {
        id: "creator",
        envKey: "STRIPE_PACK_V2_CREATOR_PRICE_ID_USD",
        credits: 110,
        amountCents: 899,
        label: "Creator Boost",
        priceLabel: "$8.99",
        useCase: "any",
        badge: "Mix",
      },
      {
        id: "studio",
        envKey: "STRIPE_PACK_V2_STUDIO_PRICE_ID_USD",
        credits: 240,
        amountCents: 1699,
        label: "Studio Boost",
        priceLabel: "$16.99",
        useCase: "any",
        badge: "Volume",
      },
      {
        id: "clip",
        envKey: "STRIPE_PACK_V2_CLIP_PRICE_ID_USD",
        credits: VIDEO_I2V_CREDIT_COST,
        amountCents: 549,
        label: "5 s Clip Boost",
        priceLabel: "$5.49",
        useCase: "video",
        badge: "Video",
      },
      {
        id: "voice",
        envKey: "STRIPE_PACK_V2_VOICE_PRICE_ID_USD",
        credits: 40,
        amountCents: 499,
        label: "Voice Boost",
        priceLabel: "$4.99",
        useCase: "voice",
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
};

function packUsageHints(credits) {
  return {
    images: Math.floor(credits / IMAGE_CREDIT_COST),
    videoI2v: Math.floor(credits / VIDEO_I2V_CREDIT_COST),
    videoV2v: Math.floor(credits / VIDEO_V2V_CREDIT_COST),
    voiceMinutes: Math.floor(credits / VOICE_CREDIT_COST),
    voiceClones: Math.floor(credits / VOICE_CLONE_CREDIT_COST),
  };
}

module.exports = {
  PRICING_CATALOG_V2,
  packUsageHints,
};
