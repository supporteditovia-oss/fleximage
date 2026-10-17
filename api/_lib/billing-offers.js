/**
 * Billing offers for LuxeFlexIA — EUR + USD catalogs.
 * Packs are priced so monthly plans stay the better deal.
 */

const PLAN_CREDITS = {
  discovery: 250,
  essential: 1200,
  ultimate: 2850,
};

const PLAN_PRICES_EUR = {
  discovery: "9,90",
  essential: "24,90",
  ultimate: "49,90",
};

const PLAN_PRICES_USD = {
  discovery: "9.99",
  essential: "24.99",
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

const CREDIT_PACKS_EUR = [
  {
    id: "mini",
    envKey: "STRIPE_PACK_MINI_PRICE_ID",
    credits: 90,
    amountCents: 349,
    label: "Boost Mini",
    priceLabel: "3,49 €",
    images: 9,
  },
  {
    id: "standard",
    envKey: "STRIPE_PACK_STANDARD_PRICE_ID",
    credits: 210,
    amountCents: 799,
    label: "Boost Standard",
    priceLabel: "7,99 €",
    images: 21,
  },
  {
    id: "plus",
    envKey: "STRIPE_PACK_PLUS_PRICE_ID",
    credits: 450,
    amountCents: 1499,
    label: "Boost Plus",
    priceLabel: "14,99 €",
    images: 45,
  },
];

const CREDIT_PACKS_USD = [
  {
    id: "mini",
    envKey: "STRIPE_PACK_MINI_PRICE_ID_USD",
    credits: 90,
    amountCents: 349,
    label: "Boost Mini",
    priceLabel: "$3.49",
    images: 9,
  },
  {
    id: "standard",
    envKey: "STRIPE_PACK_STANDARD_PRICE_ID_USD",
    credits: 210,
    amountCents: 799,
    label: "Boost Standard",
    priceLabel: "$7.99",
    images: 21,
  },
  {
    id: "plus",
    envKey: "STRIPE_PACK_PLUS_PRICE_ID_USD",
    credits: 450,
    amountCents: 1499,
    label: "Boost Plus",
    priceLabel: "$14.99",
    images: 45,
  },
];

const UPGRADE_COPY_EUR = {
  essential: {
    plan: "essential",
    priceLabel: PLAN_PRICES_EUR.essential,
    credits: PLAN_CREDITS.essential,
    creditsLabel: "1 200 crédits",
    headline: "Passe en Essential",
    pitch:
      "1 200 crédits / mois (120 images) — bien plus rentable que les packs.",
    cta: "Passer à Essential — 24,90 €/mois",
  },
  ultimate: {
    plan: "ultimate",
    priceLabel: PLAN_PRICES_EUR.ultimate,
    credits: PLAN_CREDITS.ultimate,
    creditsLabel: "2 850 crédits",
    headline: "Passe en Ultimate",
    pitch:
      "2 850 crédits / mois (285 images). Le max de volume, moins cher à l’image.",
    cta: "Passer à Ultimate — 49,90 €/mois",
  },
};

const UPGRADE_COPY_USD = {
  essential: {
    plan: "essential",
    priceLabel: PLAN_PRICES_USD.essential,
    credits: PLAN_CREDITS.essential,
    creditsLabel: "1,200 credits",
    headline: "Upgrade to Essential",
    pitch:
      "1,200 credits / month (120 images) — much better value than one-off packs.",
    cta: "Upgrade to Essential — $24.99/mo",
  },
  ultimate: {
    plan: "ultimate",
    priceLabel: PLAN_PRICES_USD.ultimate,
    credits: PLAN_CREDITS.ultimate,
    creditsLabel: "2,850 credits",
    headline: "Upgrade to Ultimate",
    pitch:
      "2,850 credits / month (285 images). Maximum volume, lowest cost per image.",
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
      { ...copy.essential, fromPlan: "discovery", recommended: true },
      { ...copy.ultimate, fromPlan: "discovery", recommended: false },
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
