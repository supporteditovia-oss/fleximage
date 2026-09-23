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
        id: "mini",
        tier: "small",
        envKey: "STRIPE_PACK_V2_MINI_PRICE_ID",
        credits: 50,
        amountCents: 349,
        label: "Boost Mini",
        priceLabel: "3,49 €",
      },
      {
        id: "standard",
        tier: "medium",
        envKey: "STRIPE_PACK_V2_STANDARD_PRICE_ID",
        credits: 120,
        amountCents: 749,
        label: "Boost Standard",
        priceLabel: "7,49 €",
      },
      {
        id: "plus",
        tier: "large",
        envKey: "STRIPE_PACK_V2_PLUS_PRICE_ID",
        credits: 260,
        amountCents: 1499,
        label: "Boost Plus",
        priceLabel: "14,99 €",
      },
    ],
    usd: [
      {
        id: "mini",
        tier: "small",
        envKey: "STRIPE_PACK_V2_MINI_PRICE_ID_USD",
        credits: 50,
        amountCents: 399,
        label: "Boost Mini",
        priceLabel: "$3.99",
      },
      {
        id: "standard",
        tier: "medium",
        envKey: "STRIPE_PACK_V2_STANDARD_PRICE_ID_USD",
        credits: 120,
        amountCents: 849,
        label: "Boost Standard",
        priceLabel: "$8.49",
      },
      {
        id: "plus",
        tier: "large",
        envKey: "STRIPE_PACK_V2_PLUS_PRICE_ID_USD",
        credits: 260,
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
