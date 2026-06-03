import fs from "node:fs";
import Stripe from "stripe";

type EnvMap = Record<string, string>;

type PlanDefinition = {
  key: "discovery" | "essential" | "ultimate";
  envKey: string;
  name: string;
  description: string;
  lookupKey: string;
  amount: number;
  credits: number;
  displayCredits: number;
  bonusCredits: number;
  badge: string;
};

/** Paste into Stripe Dashboard → Settings → Business → Product description */
export const STRIPE_BUSINESS_DESCRIPTION =
  "LarpKing (larpking.com) is a subscription-based SaaS web application for AI-powered lifestyle image creation. Users upload reference photos, select creative templates or text prompts, and generate realistic social, travel, fashion, restaurant, and luxury-style visuals. Monthly plans provide credits consumed per image or video generation, with access to templates, generation history, and downloads. The service is designed for creative, entertainment, and personal branding use—not for identity verification, fraud, or non-consensual content.";

const ENV_PATH = ".env";

const plans: PlanDefinition[] = [
  {
    key: "discovery",
    envKey: "STRIPE_DISCOVERY_PRICE_ID",
    name: "LarpKing Discovery",
    description:
      "Monthly subscription: 250 credits for AI lifestyle image generations on LarpKing.",
    lookupKey: "larpking_discovery_monthly_eur",
    amount: 890,
    credits: 250,
    displayCredits: 250,
    bonusCredits: 0,
    badge: "",
  },
  {
    key: "essential",
    envKey: "STRIPE_ESSENTIAL_PRICE_ID",
    name: "LarpKing Essential",
    description:
      "Monthly subscription: 850 credits per month plus 250 bonus credits for regular creators (images and video on LarpKing).",
    lookupKey: "larpking_essential_monthly_eur",
    amount: 1990,
    credits: 1100,
    displayCredits: 850,
    bonusCredits: 250,
    badge: "best_value",
  },
  {
    key: "ultimate",
    envKey: "STRIPE_ULTIMATE_PRICE_ID",
    name: "LarpKing Ultimate",
    description:
      "Monthly subscription: 2,500 credits per month for high-volume AI lifestyle image and video creation on LarpKing.",
    lookupKey: "larpking_ultimate_monthly_eur",
    amount: 3990,
    credits: 2500,
    displayCredits: 2500,
    bonusCredits: 0,
    badge: "exclusive",
  },
];

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

async function findOrCreateProduct(
  stripe: Stripe,
  plan: PlanDefinition,
): Promise<string> {
  const products = await stripe.products.list({ active: true, limit: 100 });
  const existing = products.data.find(
    (product) => product.metadata?.larpking_plan === plan.key,
  );

  if (existing) {
    await stripe.products.update(existing.id, {
      name: plan.name,
      description: plan.description,
      metadata: {
        ...existing.metadata,
        app: "larpking",
        larpking_plan: plan.key,
        credits_per_cycle: String(plan.credits),
        display_credits_per_cycle: String(plan.displayCredits),
        bonus_credits_per_cycle: String(plan.bonusCredits),
      },
    });
    return existing.id;
  }

  const created = await stripe.products.create({
    name: plan.name,
    description: plan.description,
    metadata: {
      app: "larpking",
      larpking_plan: plan.key,
      credits_per_cycle: String(plan.credits),
      display_credits_per_cycle: String(plan.displayCredits),
      bonus_credits_per_cycle: String(plan.bonusCredits),
    },
  });

  return created.id;
}

async function findOrCreatePrice(
  stripe: Stripe,
  plan: PlanDefinition,
  productId: string,
): Promise<string> {
  const prices = await stripe.prices.list({
    lookup_keys: [plan.lookupKey],
    active: true,
    limit: 1,
  });
  const existing = prices.data[0];
  const metadata = {
    app: "larpking",
    plan_type: plan.key,
    credits_per_cycle: String(plan.credits),
    display_credits_per_cycle: String(plan.displayCredits),
    bonus_credits_per_cycle: String(plan.bonusCredits),
    billing_interval: "month",
    badge: plan.badge,
  };

  if (existing) {
    const interval = existing.recurring?.interval;
    if (
      existing.unit_amount !== plan.amount ||
      existing.currency !== "eur" ||
      interval !== "month"
    ) {
      throw new Error(
        `Existing Stripe price ${existing.id} for ${plan.lookupKey} has unexpected amount/currency/interval`,
      );
    }
    await stripe.prices.update(existing.id, {
      metadata: {
        ...existing.metadata,
        ...metadata,
      },
    });
    return existing.id;
  }

  const created = await stripe.prices.create({
    product: productId,
    currency: "eur",
    unit_amount: plan.amount,
    recurring: { interval: "month" },
    lookup_key: plan.lookupKey,
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
  const results: Record<string, string> = {};

  for (const plan of plans) {
    const productId = await findOrCreateProduct(stripe, plan);
    const priceId = await findOrCreatePrice(stripe, plan, productId);
    results[plan.envKey] = priceId;
    console.log(`${plan.name}: ${priceId}`);
  }

  writeEnvValues(raw, results);
  console.log("Stripe plan price IDs written to .env");
  console.log("\nStripe business product description (Dashboard → Business):\n");
  console.log(STRIPE_BUSINESS_DESCRIPTION);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
