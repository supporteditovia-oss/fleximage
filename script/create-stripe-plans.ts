import fs from "node:fs";
import Stripe from "stripe";

type EnvMap = Record<string, string>;
type Currency = "eur" | "usd";
type CatalogItem = {
  id: string;
  kind: "subscription" | "pack";
  currency: Currency;
  envKey: string;
  lookupKey: string;
  name: string;
  description: string;
  amount: number;
  credits: number;
  badge?: string;
};

/** Paste into Stripe Dashboard → Settings → Business → Product description */
export const STRIPE_BUSINESS_DESCRIPTION =
  "LuxeFlexIA is a subscription-based SaaS web application for AI-powered lifestyle image creation. Users upload reference photos, select creative templates or text prompts, and generate realistic social, travel, fashion, restaurant, and luxury-style visuals. Monthly plans provide credits consumed per image or video generation, with access to templates, generation history, and downloads. The service is designed for creative, entertainment, and personal branding use—not for identity verification, fraud, or non-consensual content.";

const ENV_PATH = ".env";
const PRICING_VERSION = "20261017";
const PLAN_DEFINITIONS = [
  { id: "discovery", name: "Découverte", credits: 250, badge: "" },
  { id: "essential", name: "Essentiel", credits: 1200, badge: "best_value" },
  { id: "ultimate", name: "Ultimate", credits: 2850, badge: "exclusive" },
] as const;
const PACK_DEFINITIONS = [
  { id: "mini", name: "Boost Mini", credits: 90 },
  { id: "standard", name: "Boost Standard", credits: 210 },
  { id: "plus", name: "Boost Plus", credits: 450 },
] as const;
const SUBSCRIPTION_PRICES: Record<
  Currency,
  Record<(typeof PLAN_DEFINITIONS)[number]["id"], number>
> = {
  eur: { discovery: 990, essential: 2490, ultimate: 4990 },
  usd: { discovery: 999, essential: 2499, ultimate: 4999 },
};
const PACK_PRICES: Record<
  Currency,
  Record<(typeof PACK_DEFINITIONS)[number]["id"], number>
> = {
  eur: { mini: 349, standard: 799, plus: 1499 },
  usd: { mini: 349, standard: 799, plus: 1499 },
};

function planEnvKey(
  id: (typeof PLAN_DEFINITIONS)[number]["id"],
  currency: Currency,
): string {
  const key = `STRIPE_${id.toUpperCase()}_PRICE_ID`;
  return currency === "usd" ? `${key}_USD` : key;
}

function packEnvKey(
  id: (typeof PACK_DEFINITIONS)[number]["id"],
  currency: Currency,
): string {
  const key = `STRIPE_PACK_${id.toUpperCase()}_PRICE_ID`;
  return currency === "usd" ? `${key}_USD` : key;
}

const catalog: CatalogItem[] = (["eur", "usd"] as const).flatMap(
  (currency) => [
    ...PLAN_DEFINITIONS.map((plan) => ({
      id: plan.id,
      kind: "subscription" as const,
      currency,
      envKey: planEnvKey(plan.id, currency),
      lookupKey: `luxeflexia_${plan.id}_${currency}_monthly_v${PRICING_VERSION}`,
      name: `LuxeFlexIA ${plan.name} — ${plan.credits} crédits`,
      description: `${plan.credits} credits included in each monthly billing cycle.`,
      amount: SUBSCRIPTION_PRICES[currency][plan.id],
      credits: plan.credits,
      badge: plan.badge,
    })),
    ...PACK_DEFINITIONS.map((pack) => ({
      id: pack.id,
      kind: "pack" as const,
      currency,
      envKey: packEnvKey(pack.id, currency),
      lookupKey: `luxeflexia_boost_${pack.id}_${currency}_once_v${PRICING_VERSION}`,
      name: `LuxeFlexIA ${pack.name} — ${pack.credits} crédits`,
      description: `${pack.credits} one-time credits for LuxeFlexIA.`,
      amount: PACK_PRICES[currency][pack.id],
      credits: pack.credits,
    })),
  ],
);

function readEnvFile(path: string): { raw: string; env: EnvMap } {
  const raw = fs.readFileSync(path, "utf8");
  const env: EnvMap = {};

  for (const line of raw.split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line) || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return { raw, env };
}

function writeEnvValues(raw: string, values: Record<string, string>): void {
  let output = raw;
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    if (pattern.test(output)) {
      output = output.replace(pattern, line);
    } else if (/^STRIPE_WEBHOOK_SECRET=.*$/m.test(output)) {
      output = output.replace(/^(STRIPE_WEBHOOK_SECRET=.*)$/m, `$1\n${line}`);
    } else {
      output += `\n${line}`;
    }
  }
  fs.writeFileSync(ENV_PATH, output);
}

function productMetadata(item: CatalogItem): Record<string, string> {
  return {
    app: "luxeflexia",
    ...(item.kind === "subscription"
      ? {
          luxeflexia_plan: item.id,
          credits_per_cycle: String(item.credits),
        }
      : {
          luxeflexia_pack: item.id,
          credits: String(item.credits),
        }),
  };
}

async function findOrCreateProduct(
  stripe: Stripe,
  item: CatalogItem,
): Promise<string> {
  const products = await stripe.products.list({ active: true, limit: 100 });
  const existing = products.data.find((product) =>
    item.kind === "subscription"
      ? product.metadata?.luxeflexia_plan === item.id ||
        product.metadata?.larpking_plan === item.id
      : product.metadata?.luxeflexia_pack === item.id,
  );
  const metadata = {
    ...existing?.metadata,
    ...productMetadata(item),
  };

  if (existing) {
    await stripe.products.update(existing.id, {
      name: item.name,
      description: item.description,
      metadata,
    });
    return existing.id;
  }

  const created = await stripe.products.create({
    name: item.name,
    description: item.description,
    metadata,
  });
  return created.id;
}

function priceMetadata(item: CatalogItem): Record<string, string> {
  return {
    app: "luxeflexia",
    currency: item.currency,
    ...(item.kind === "subscription"
      ? {
          plan_type: item.id,
          credits_per_cycle: String(item.credits),
          display_credits_per_cycle: String(item.credits),
          bonus_credits_per_cycle: "0",
          billing_interval: "month",
          badge: item.badge || "",
        }
      : {
          purchase_type: "credit_pack",
          pack_id: item.id,
          credits: String(item.credits),
        }),
  };
}

async function findOrCreatePrice(
  stripe: Stripe,
  item: CatalogItem,
  productId: string,
): Promise<string> {
  const prices = await stripe.prices.list({
    lookup_keys: [item.lookupKey],
    limit: 1,
  });
  const existing = prices.data[0];
  const metadata = priceMetadata(item);
  const interval = item.kind === "subscription" ? "month" : null;

  if (existing) {
    if (
      existing.unit_amount !== item.amount ||
      existing.currency !== item.currency ||
      (existing.recurring?.interval ?? null) !== interval
    ) {
      throw new Error(
        `Stripe price for ${item.lookupKey} exists with a different configuration`,
      );
    }
    if (!existing.active) {
      await stripe.prices.update(existing.id, { active: true });
    }
    await stripe.prices.update(existing.id, {
      metadata: { ...existing.metadata, ...metadata },
    });
    return existing.id;
  }

  const created = await stripe.prices.create({
    product: productId,
    currency: item.currency,
    unit_amount: item.amount,
    ...(item.kind === "subscription"
      ? { recurring: { interval: "month" as const } }
      : {}),
    lookup_key: item.lookupKey,
    metadata,
  });
  return created.id;
}

async function main(): Promise<void> {
  const { raw, env } = readEnvFile(ENV_PATH);
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is missing from .env");
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const values: Record<string, string> = {};
  for (const item of catalog) {
    const productId = await findOrCreateProduct(stripe, item);
    values[item.envKey] = await findOrCreatePrice(stripe, item, productId);
    console.log(`Prepared ${item.name} (${item.currency.toUpperCase()})`);
  }

  writeEnvValues(raw, values);
  console.log("All subscription and boost Price IDs saved to .env.");
  console.log("\nStripe business product description:\n");
  console.log(STRIPE_BUSINESS_DESCRIPTION);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
