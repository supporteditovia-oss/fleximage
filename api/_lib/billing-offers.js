/**
 * Billing offers for LuxeFlexIA — EUR + USD catalogs.
 * Packs are priced ~2.5–3× au crédit vs abonnement (plans toujours gagnants).
 */

const { PLAN_CREDITS } = require("./credit-costs");

const PLAN_PRICES_EUR = {
  discovery: "10",
  essential: "25",
  ultimate: "49",
};

const PLAN_PRICES_USD = {
  discovery: "10.99",
  essential: "25.99",
  ultimate: "49.99",
};

const PLAN_ENV_KEYS_EUR = {
  discovery: "STRIPE_DISCOVERY_PRICE_ID",
  essential: "STRIPE_ESSENTIAL_PRICE_ID",
  ultimate: "STRIPE_ULTIMATE_PRICE_ID",
};

const PLAN_ENV_KEYS_USD = {
  discovery: "STRIPE_DISCOVERY_PRICE_ID_USD",
  essential: "STRIPE_ESSENTIAL_PRICE_ID_USD",
  ultimate: "STRIPE_ULTIMATE_PRICE_ID_USD",
};

/** Rank for upgrade comparisons (higher = better). */
const PLAN_RANK = {
  free: 0,
  discovery: 1,
  essential: 2,
  ultimate: 3,
  admin: 99,
  unknown: 1,
};

/** Packs universels — mêmes crédits pour image, vidéo, voix et clone (pas d’arbitrage). */
const CREDIT_PACKS_EUR = [
  {
    id: "mini",
    envKey: "STRIPE_PACK_MINI_PRICE_ID",
    credits: 60,
    amountCents: 799,
    label: "Boost S",
    priceLabel: "7,99 €",
    images: 5,
    videos: 1,
    voices: 7,
  },
  {
    id: "standard",
    envKey: "STRIPE_PACK_STANDARD_PRICE_ID",
    credits: 120,
    amountCents: 1499,
    label: "Boost M",
    priceLabel: "14,99 €",
    images: 10,
    videos: 2,
    voices: 15,
    recommended: true,
  },
  {
    id: "plus",
    envKey: "STRIPE_PACK_PLUS_PRICE_ID",
    credits: 240,
    amountCents: 2799,
    label: "Boost L",
    priceLabel: "27,99 €",
    images: 20,
    videos: 4,
    voices: 30,
    bestValue: true,
  },
];

const CREDIT_PACKS_USD = [
  {
    id: "mini",
    envKey: "STRIPE_PACK_MINI_PRICE_ID_USD",
    credits: 60,
    amountCents: 799,
    label: "Boost S",
    priceLabel: "$7.99",
    images: 5,
    videos: 1,
    voices: 7,
  },
  {
    id: "standard",
    envKey: "STRIPE_PACK_STANDARD_PRICE_ID_USD",
    credits: 120,
    amountCents: 1499,
    label: "Boost M",
    priceLabel: "$14.99",
    images: 10,
    videos: 2,
    voices: 15,
    recommended: true,
  },
  {
    id: "plus",
    envKey: "STRIPE_PACK_PLUS_PRICE_ID_USD",
    credits: 240,
    amountCents: 2799,
    label: "Boost L",
    priceLabel: "$27.99",
    images: 20,
    videos: 4,
    voices: 30,
    bestValue: true,
  },
];

const UPGRADE_COPY_EUR = {
  essential: {
    plan: "essential",
    priceLabel: PLAN_PRICES_EUR.essential,
    credits: PLAN_CREDITS.essential,
    creditsLabel: "840 crédits",
    headline: "Passe en Essential",
    pitch:
      "840 cr / mois — images, vidéos, voix et clones. Bien plus rentable que les packs.",
    cta: "Passer à Essential — 25 €/mois",
  },
  ultimate: {
    plan: "ultimate",
    priceLabel: PLAN_PRICES_EUR.ultimate,
    credits: PLAN_CREDITS.ultimate,
    creditsLabel: "1 920 crédits",
    headline: "Passe en Ultimate",
    pitch:
      "1 920 cr / mois — 160 images, 32 vidéos, voix & clones. Meilleur rapport.",
    cta: "Passer à Ultimate — 49 €/mois",
  },
};

const UPGRADE_COPY_USD = {
  essential: {
    plan: "essential",
    priceLabel: PLAN_PRICES_USD.essential,
    credits: PLAN_CREDITS.essential,
    creditsLabel: "840 credits",
    headline: "Upgrade to Essential",
    pitch:
      "840 cr / month — images, videos, voice & clones. Much better value than packs.",
    cta: "Upgrade to Essential — $25.99/mo",
  },
  ultimate: {
    plan: "ultimate",
    priceLabel: PLAN_PRICES_USD.ultimate,
    credits: PLAN_CREDITS.ultimate,
    creditsLabel: "1,920 credits",
    headline: "Upgrade to Ultimate",
    pitch:
      "1,920 cr / month — 160 images, 32 videos, voice & clones. Best value.",
    cta: "Upgrade to Ultimate — $49.99/mo",
  },
};

function normalizeCurrency(input) {
  const raw = String(input || "")
    .trim()
    .toLowerCase();
  if (raw === "usd" || raw === "us") return "usd";
  if (raw === "eur" || raw === "eu" || raw === "fr") return "eur";
  if (raw.startsWith("en")) return "usd";
  return "eur";
}

/** Resolve billing currency from locale string, explicit currency, or market hint. */
function resolveBillingCurrency(input) {
  if (input && typeof input === "object") {
    if (input.currency) return normalizeCurrency(input.currency);
    if (input.market) return normalizeCurrency(input.market);
    if (input.locale) return normalizeCurrency(input.locale);
  }
  return normalizeCurrency(input);
}

function getPlanEnvKeys(currency) {
  return currency === "usd" ? PLAN_ENV_KEYS_USD : PLAN_ENV_KEYS_EUR;
}

function getPlanPriceEnvKey(plan, currency) {
  const keys = getPlanEnvKeys(currency);
  return keys[plan] || keys.discovery;
}

function getCreditPacks(currency) {
  return currency === "usd" ? CREDIT_PACKS_USD : CREDIT_PACKS_EUR;
}

function getUpgradeCopy(currency) {
  return currency === "usd" ? UPGRADE_COPY_USD : UPGRADE_COPY_EUR;
}

function getPlanPrices(currency) {
  return currency === "usd" ? PLAN_PRICES_USD : PLAN_PRICES_EUR;
}

function normalizePlan(plan) {
  if (plan === "ultimate") return "ultimate";
  if (plan === "essential" || plan === "monthly" || plan === "video") {
    return "essential";
  }
  if (plan === "discovery" || plan === "weekly" || plan === "image") {
    return "discovery";
  }
  return "discovery";
}

function getPackById(packId, currency = "eur") {
  return getCreditPacks(currency).find((p) => p.id === packId) || null;
}

function getUpgradeOffers(currentPlanType, currency = "eur") {
  const copy = getUpgradeCopy(currency);
  const plan = String(currentPlanType || "free").toLowerCase();
  if (plan === "discovery" || plan === "unknown" || plan === "free") {
    return [
      { ...copy.ultimate, fromPlan: "discovery", recommended: true },
      { ...copy.essential, fromPlan: "discovery", recommended: false },
    ];
  }
  if (plan === "essential") {
    return [{ ...copy.ultimate, fromPlan: "essential", recommended: true }];
  }
  return [];
}

function getUpgradeTarget(currentPlanType, currency = "eur") {
  const offers = getUpgradeOffers(currentPlanType, currency);
  return offers[0] || null;
}

function listConfiguredPacks(currency = "eur") {
  return getCreditPacks(currency)
    .map((pack) => ({
      ...pack,
      configured: Boolean(process.env[pack.envKey]),
      priceId: process.env[pack.envKey] || null,
    }))
    .filter((p) => p.configured);
}

/** Fallback EUR pack env if USD price is not configured yet. */
function resolvePackEnvKey(pack, currency) {
  const primary = pack.envKey;
  if (currency !== "usd") return primary;
  if (process.env[primary]) return primary;
  const eurPack = CREDIT_PACKS_EUR.find((p) => p.id === pack.id);
  return eurPack?.envKey || primary;
}

function resolvePlanPriceId(plan, currency) {
  const normalized = normalizePlan(plan);
  const primaryKey = getPlanPriceEnvKey(normalized, currency);
  if (process.env[primaryKey]) return process.env[primaryKey];
  if (currency === "usd") {
    const eurKey = getPlanPriceEnvKey(normalized, "eur");
    return process.env[eurKey] || null;
  }
  return null;
}

module.exports = {
  PLAN_CREDITS,
  PLAN_PRICES_EUR,
  PLAN_PRICES_USD,
  PLAN_RANK,
  CREDIT_PACKS: CREDIT_PACKS_EUR,
  CREDIT_PACKS_EUR,
  CREDIT_PACKS_USD,
  normalizePlan,
  normalizeCurrency,
  resolveBillingCurrency,
  getPlanEnvKeys,
  getPlanPriceEnvKey,
  getPlanPrices,
  getCreditPacks,
  getPackById,
  getUpgradeTarget,
  getUpgradeOffers,
  listConfiguredPacks,
  resolvePackEnvKey,
  resolvePlanPriceId,
};
