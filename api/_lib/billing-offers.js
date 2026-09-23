/**
 * Billing offers for LuxeFlexIA — EUR + USD catalogs.
 * Packs are priced so monthly plans stay the better deal.
 * Grille v2 (PRICING_V2_ENABLED=1) : shared/pricing-catalog-v2 — Stripe v2 séparé.
 */

const { isPricingV2Enabled } = require("./pricing-flags");
const {
  PRICING_CATALOG_V2,
  packUsageHints,
} = require("./pricing-catalog-v2");

const PLAN_CREDITS_V1 = {
  discovery: 250,
  essential: 1100,
  ultimate: 2500,
};

const PLAN_PRICES_EUR = {
  discovery: "8,90",
  essential: "19,90",
  ultimate: "39,90",
};

const PLAN_PRICES_USD = {
  discovery: "9.99",
  essential: "19.99",
  ultimate: "39.99",
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
    credits: 50,
    amountCents: 290,
    label: "Boost Mini",
    priceLabel: "2,90 €",
    images: 5,
  },
  {
    id: "standard",
    envKey: "STRIPE_PACK_STANDARD_PRICE_ID",
    credits: 120,
    amountCents: 590,
    label: "Boost Standard",
    priceLabel: "5,90 €",
    images: 12,
  },
  {
    id: "plus",
    envKey: "STRIPE_PACK_PLUS_PRICE_ID",
    credits: 250,
    amountCents: 990,
    label: "Boost Plus",
    priceLabel: "9,90 €",
    images: 25,
  },
];

const CREDIT_PACKS_USD = [
  {
    id: "mini",
    envKey: "STRIPE_PACK_MINI_PRICE_ID_USD",
    credits: 50,
    amountCents: 299,
    label: "Boost Mini",
    priceLabel: "$2.99",
    images: 5,
  },
  {
    id: "standard",
    envKey: "STRIPE_PACK_STANDARD_PRICE_ID_USD",
    credits: 120,
    amountCents: 599,
    label: "Boost Standard",
    priceLabel: "$5.99",
    images: 12,
  },
  {
    id: "plus",
    envKey: "STRIPE_PACK_PLUS_PRICE_ID_USD",
    credits: 250,
    amountCents: 999,
    label: "Boost Plus",
    priceLabel: "$9.99",
    images: 25,
  },
];

const UPGRADE_COPY_EUR = {
  essential: {
    plan: "essential",
    priceLabel: PLAN_PRICES_EUR.essential,
    credits: PLAN_CREDITS_V1.essential,
    creditsLabel: "1 100 crédits",
    headline: "Passe en Essential",
    pitch:
      "1 100 crédits / mois (110 images) — bien plus rentable que les packs.",
    cta: "Passer à Essential — 19,90 €/mois",
  },
  ultimate: {
    plan: "ultimate",
    priceLabel: PLAN_PRICES_EUR.ultimate,
    credits: PLAN_CREDITS_V1.ultimate,
    creditsLabel: "2 500 crédits",
    headline: "Passe en Ultimate",
    pitch:
      "2 500 crédits / mois (250 images). Le max de volume, moins cher à l’image.",
    cta: "Passer à Ultimate — 39,90 €/mois",
  },
};

const UPGRADE_COPY_USD = {
  essential: {
    plan: "essential",
    priceLabel: PLAN_PRICES_USD.essential,
    credits: PLAN_CREDITS_V1.essential,
    creditsLabel: "1,100 credits",
    headline: "Upgrade to Essential",
    pitch:
      "1,100 credits / month (110 images) — much better value than one-off packs.",
    cta: "Upgrade to Essential — $19.99/mo",
  },
  ultimate: {
    plan: "ultimate",
    priceLabel: PLAN_PRICES_USD.ultimate,
    credits: PLAN_CREDITS_V1.ultimate,
    creditsLabel: "2,500 credits",
    headline: "Upgrade to Ultimate",
    pitch:
      "2,500 credits / month (250 images). Maximum volume, lowest cost per image.",
    cta: "Upgrade to Ultimate — $39.99/mo",
  },
};

const PLAN_PRICES_EUR_V2 = {
  discovery: "9,90",
  essential: "24,90",
  ultimate: "49,90",
};

const PLAN_PRICES_USD_V2 = {
  discovery: "10.99",
  essential: "27.99",
  ultimate: "54.99",
};

function formatCreditsLabel(n, currency) {
  const s = String(n);
  if (currency === "usd") {
    return `${s.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} credits`;
  }
  return `${s.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} crédits`;
}

function buildUpgradeCopyV2(currency) {
  const prices =
    currency === "usd" ? PLAN_PRICES_USD_V2 : PLAN_PRICES_EUR_V2;
  const ess = PRICING_CATALOG_V2.subscriptions.find((s) => s.id === "essential");
  const ult = PRICING_CATALOG_V2.subscriptions.find((s) => s.id === "ultimate");
  const eurSuffix = currency === "usd" ? "/mo" : "/mois";
  const money = (plan) =>
    currency === "usd" ? `$${prices[plan]}` : `${prices[plan]} €`;

  if (currency === "usd") {
    return {
      essential: {
        plan: "essential",
        priceLabel: prices.essential,
        credits: ess.creditsPerMonth,
        creditsLabel: formatCreditsLabel(ess.creditsPerMonth, currency),
        headline: "Upgrade to Essential",
        pitch: `${formatCreditsLabel(ess.creditsPerMonth, currency)} / month — images, voice & video in one plan.`,
        cta: `Upgrade to Essential — ${money("essential")}${eurSuffix}`,
      },
      ultimate: {
        plan: "ultimate",
        priceLabel: prices.ultimate,
        credits: ult.creditsPerMonth,
        creditsLabel: formatCreditsLabel(ult.creditsPerMonth, currency),
        headline: "Upgrade to Ultimate",
        pitch: `${formatCreditsLabel(ult.creditsPerMonth, currency)} / month — max volume + V2V Motion.`,
        cta: `Upgrade to Ultimate — ${money("ultimate")}${eurSuffix}`,
      },
    };
  }

  return {
    essential: {
      plan: "essential",
      priceLabel: prices.essential,
      credits: ess.creditsPerMonth,
      creditsLabel: formatCreditsLabel(ess.creditsPerMonth, currency),
      headline: "Passe en Essentiel",
      pitch: `${formatCreditsLabel(ess.creditsPerMonth, currency)} / mois — images, voix & vidéo dans un seul plan.`,
      cta: `Passer à Essentiel — ${money("essential")}${eurSuffix}`,
    },
    ultimate: {
      plan: "ultimate",
      priceLabel: prices.ultimate,
      credits: ult.creditsPerMonth,
      creditsLabel: formatCreditsLabel(ult.creditsPerMonth, currency),
      headline: "Passe en Ultimate",
      pitch: `${formatCreditsLabel(ult.creditsPerMonth, currency)} / mois — volume max + V2V Motion.`,
      cta: `Passer à Ultimate — ${money("ultimate")}${eurSuffix}`,
    },
  };
}

function getActivePlanCredits() {
  if (!isPricingV2Enabled()) return PLAN_CREDITS_V1;
  return {
    discovery: PRICING_CATALOG_V2.subscriptions[0].creditsPerMonth,
    essential: PRICING_CATALOG_V2.subscriptions[1].creditsPerMonth,
    ultimate: PRICING_CATALOG_V2.subscriptions[2].creditsPerMonth,
  };
}

function enrichPackRow(pack) {
  const hints = packUsageHints(pack.credits);
  return {
    ...pack,
    images: hints.images,
    usageHints: hints,
  };
}

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
  if (isPricingV2Enabled()) {
    const rows =
      currency === "usd"
        ? PRICING_CATALOG_V2.creditPacks.usd
        : PRICING_CATALOG_V2.creditPacks.eur;
    return rows.map(enrichPackRow);
  }
  return currency === "usd" ? CREDIT_PACKS_USD : CREDIT_PACKS_EUR;
}

function getUpgradeCopy(currency) {
  if (isPricingV2Enabled()) return buildUpgradeCopyV2(currency);
  return currency === "usd" ? UPGRADE_COPY_USD : UPGRADE_COPY_EUR;
}

function getPlanPrices(currency) {
  if (isPricingV2Enabled()) {
    return currency === "usd" ? PLAN_PRICES_USD_V2 : PLAN_PRICES_EUR_V2;
  }
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

/** Catalogue packs pour UI (inclut non configurés Stripe si v2 preview). */
function listCreditPackCatalog(currency = "eur") {
  const includeUnconfigured =
    isPricingV2Enabled() &&
    String(process.env.PRICING_V2_PREVIEW_PACKS || "").trim() === "1";
  const rows = getCreditPacks(currency).map((pack) => ({
    ...pack,
    configured: Boolean(process.env[pack.envKey]),
    priceId: process.env[pack.envKey] || null,
    available: Boolean(process.env[pack.envKey]) || includeUnconfigured,
  }));
  return includeUnconfigured ? rows : rows.filter((p) => p.configured);
}

/** Fallback EUR pack env if USD price is not configured yet. */
function resolvePackEnvKey(pack, currency) {
  const primary = pack.envKey;
  if (currency !== "usd") return primary;
  if (process.env[primary]) return primary;
  const eurRows = isPricingV2Enabled()
    ? PRICING_CATALOG_V2.creditPacks.eur
    : CREDIT_PACKS_EUR;
  const eurPack = eurRows.find((p) => p.id === pack.id);
  return eurPack?.envKey || primary;
}

function resolvePlanPriceId(plan, currency) {
  const normalized = normalizePlan(plan);
  if (isPricingV2Enabled()) {
    const v2Keys =
      PRICING_CATALOG_V2.planStripeEnvKeys[currency === "usd" ? "usd" : "eur"];
    const v2Key = v2Keys[normalized];
    if (v2Key && process.env[v2Key]) return process.env[v2Key];
  }
  const primaryKey = getPlanPriceEnvKey(normalized, currency);
  if (process.env[primaryKey]) return process.env[primaryKey];
  if (currency === "usd") {
    const eurKey = getPlanPriceEnvKey(normalized, "eur");
    return process.env[eurKey] || null;
  }
  return null;
}

function getPricingCatalogVersion() {
  return isPricingV2Enabled() ? "v2" : "v1";
}

module.exports = {
  getActivePlanCredits,
  getPricingCatalogVersion,
  PLAN_CREDITS: PLAN_CREDITS_V1,
  PLAN_CREDITS_V1,
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
  listCreditPackCatalog,
  resolvePackEnvKey,
  resolvePlanPriceId,
  isPricingV2Enabled,
};
