import fs from "node:fs";
import Stripe from "stripe";

type EnvMap = Record<string, string | undefined>;
type CheckStatus = "pass" | "warn" | "fail";

type Check = {
  status: CheckStatus;
  area: string;
  message: string;
};

type PriceDefinition = {
  key: string;
  kind: "subscription" | "pack";
  currency: "eur" | "usd";
  envKey: string;
  lookupKey: string;
  amount: number;
  credits: number;
  interval: "month" | null;
};

const ENV_PATH = ".env";
const REQUIRED_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "invoice.paid",
  "customer.subscription.deleted",
  "customer.subscription.updated",
] as const;

const PLAN_CATALOG = [
  { key: "discovery", credits: 250 },
  { key: "essential", credits: 1200 },
  { key: "ultimate", credits: 2850 },
] as const;
const PACK_CATALOG = [
  { key: "mini", credits: 90 },
  { key: "standard", credits: 210 },
  { key: "plus", credits: 450 },
] as const;
const PRICES = {
  eur: {
    plans: { discovery: 990, essential: 2490, ultimate: 4990 },
    packs: { mini: 349, standard: 799, plus: 1499 },
  },
  usd: {
    plans: { discovery: 999, essential: 2499, ultimate: 4999 },
    packs: { mini: 349, standard: 799, plus: 1499 },
  },
} as const;
const PRICING_VERSION = "20261017";
const CATALOG: PriceDefinition[] = (["eur", "usd"] as const).flatMap(
  (currency) => [
    ...PLAN_CATALOG.map((plan) => ({
      key: plan.key,
      kind: "subscription" as const,
      currency,
      envKey: `STRIPE_${plan.key.toUpperCase()}_PRICE_ID${currency === "usd" ? "_USD" : ""}`,
      lookupKey: `luxeflexia_${plan.key}_${currency}_monthly_v${PRICING_VERSION}`,
      amount: PRICES[currency].plans[plan.key],
      credits: plan.credits,
      interval: "month" as const,
    })),
    ...PACK_CATALOG.map((pack) => ({
      key: pack.key,
      kind: "pack" as const,
      currency,
      envKey: `STRIPE_PACK_${pack.key.toUpperCase()}_PRICE_ID${currency === "usd" ? "_USD" : ""}`,
      lookupKey: `luxeflexia_boost_${pack.key}_${currency}_once_v${PRICING_VERSION}`,
      amount: PRICES[currency].packs[pack.key],
      credits: pack.credits,
      interval: null,
    })),
  ],
);

function parseArgs(): { requireLive: boolean; envPath: string } {
  const args = process.argv.slice(2);
  const envPathIndex = args.indexOf("--env");
  return {
    requireLive: args.includes("--require-live"),
    envPath:
      envPathIndex >= 0 && args[envPathIndex + 1]
        ? args[envPathIndex + 1]
        : ENV_PATH,
  };
}

function readEnvFile(path: string): EnvMap {
  if (!fs.existsSync(path)) return {};
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

  return env;
}

function addCheck(
  checks: Check[],
  status: CheckStatus,
  area: string,
  message: string,
): void {
  checks.push({ status, area, message });
}

function maskId(value: string | undefined): string {
  if (!value) return "(missing)";
  if (value.length <= 10) return "(present)";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function isPlaceholderWebhookSecret(value: string | undefined): boolean {
  return !value?.trim() || value.includes("your_") || value === "whsec_your_stripe_webhook_secret";
}

function isExpectedUrl(actual: string, expected: string | undefined): boolean {
  if (!expected?.trim()) return true;
  try {
    const actualUrl = new URL(actual);
    const expectedUrl = new URL(expected);
    return actualUrl.toString() === expectedUrl.toString();
  } catch {
    return false;
  }
}

function webhookHasRequiredEvents(enabledEvents: string[]): boolean {
  if (enabledEvents.includes("*")) return true;
  return REQUIRED_WEBHOOK_EVENTS.every((eventName) =>
    enabledEvents.includes(eventName),
  );
}

async function auditStripe(
  checks: Check[],
  env: EnvMap,
  requireLive: boolean,
): Promise<void> {
  const secretKey = env.STRIPE_SECRET_KEY;
  const keyMode = secretKey?.startsWith("sk_live_")
    ? "live"
    : secretKey?.startsWith("sk_test_")
      ? "test"
      : "unknown";

  if (!secretKey) {
    addCheck(checks, "fail", "stripe.env", "STRIPE_SECRET_KEY is missing");
    return;
  }

  addCheck(checks, "pass", "stripe.env", `STRIPE_SECRET_KEY mode: ${keyMode}`);

  if (requireLive && keyMode !== "live") {
    addCheck(checks, "fail", "stripe.env", "--require-live needs an sk_live_ key");
  }

  if (env.NODE_ENV === "production" && keyMode !== "live") {
    addCheck(checks, "fail", "stripe.env", "NODE_ENV=production must not use a test Stripe key");
  }

  if (isPlaceholderWebhookSecret(env.STRIPE_WEBHOOK_SECRET)) {
    addCheck(checks, "fail", "stripe.env", "STRIPE_WEBHOOK_SECRET is missing or placeholder");
  } else {
    addCheck(checks, "pass", "stripe.env", "STRIPE_WEBHOOK_SECRET is present");
  }

  const stripe = new Stripe(secretKey);

  for (const item of CATALOG) {
    const area = `stripe.price.${item.kind}.${item.key}.${item.currency}`;
    const priceId = env[item.envKey];
    if (!priceId) {
      addCheck(checks, "fail", area, `${item.envKey} is missing`);
      continue;
    }

    let price: Stripe.Price;
    try {
      price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
    } catch (error: any) {
      addCheck(
        checks,
        "fail",
        area,
        `Cannot retrieve ${maskId(priceId)}: ${error.message}`,
      );
      continue;
    }

    const product =
      typeof price.product === "object" ? (price.product as Stripe.Product) : null;

    addCheck(
      checks,
      price.active ? "pass" : "fail",
      area,
      `Price ${maskId(price.id)} active=${price.active}`,
    );
    addCheck(
      checks,
      requireLive && !price.livemode ? "fail" : "pass",
      area,
      `Price livemode=${price.livemode}`,
    );
    addCheck(
      checks,
      price.currency === item.currency ? "pass" : "fail",
      area,
      `Currency is ${price.currency}`,
    );
    addCheck(
      checks,
      price.unit_amount === item.amount ? "pass" : "fail",
      area,
      `Amount is ${price.unit_amount}`,
    );
    addCheck(
      checks,
      (price.recurring?.interval ?? null) === item.interval ? "pass" : "fail",
      area,
      `Recurring interval is ${price.recurring?.interval ?? "none"}`,
    );
    addCheck(
      checks,
      price.lookup_key === item.lookupKey ? "pass" : "fail",
      area,
      `Lookup key is ${price.lookup_key ?? "missing"}`,
    );
    addCheck(
      checks,
      price.metadata?.currency === item.currency ? "pass" : "fail",
      area,
      `Metadata currency is ${price.metadata?.currency ?? "missing"}`,
    );
    addCheck(
      checks,
      (item.kind === "subscription"
        ? price.metadata?.plan_type === item.key &&
          price.metadata?.credits_per_cycle === String(item.credits)
        : price.metadata?.pack_id === item.key &&
          price.metadata?.credits === String(item.credits))
        ? "pass"
        : "fail",
      area,
      item.kind === "subscription"
        ? `Plan metadata credits_per_cycle is ${price.metadata?.credits_per_cycle ?? "missing"}`
        : `Pack metadata credits is ${price.metadata?.credits ?? "missing"}`,
    );

    if (!product) {
      addCheck(checks, "fail", `${area}.product`, "Product is not expandable");
      continue;
    }

    addCheck(
      checks,
      product.active ? "pass" : "fail",
      `${area}.product`,
      `Product active=${product.active}`,
    );
    addCheck(
      checks,
      requireLive && !product.livemode ? "fail" : "pass",
      `${area}.product`,
      `Product livemode=${product.livemode}`,
    );
    addCheck(
      checks,
      (item.kind === "subscription"
        ? product.metadata?.luxeflexia_plan === item.key &&
          product.metadata?.credits_per_cycle === String(item.credits)
        : product.metadata?.luxeflexia_pack === item.key &&
          product.metadata?.credits === String(item.credits))
        ? "pass"
        : "fail",
      `${area}.product`,
      item.kind === "subscription"
        ? "Product plan and credit metadata match"
        : "Product pack and credit metadata match",
    );
  }

  const endpointId = env.STRIPE_WEBHOOK_ENDPOINT_ID;
  if (!endpointId) {
    addCheck(checks, "fail", "stripe.webhook", "STRIPE_WEBHOOK_ENDPOINT_ID is missing");
    return;
  }

  try {
    const endpoint = await stripe.webhookEndpoints.retrieve(endpointId);
    addCheck(
      checks,
      endpoint.status === "enabled" ? "pass" : "fail",
      "stripe.webhook",
      `Webhook ${maskId(endpoint.id)} status=${endpoint.status}`,
    );
    addCheck(
      checks,
      requireLive && !endpoint.livemode ? "fail" : "pass",
      "stripe.webhook",
      `Webhook livemode=${endpoint.livemode}`,
    );
    addCheck(
      checks,
      isExpectedUrl(endpoint.url, env.STRIPE_WEBHOOK_URL) ? "pass" : "fail",
      "stripe.webhook",
      "Webhook URL matches STRIPE_WEBHOOK_URL",
    );
    addCheck(
      checks,
      webhookHasRequiredEvents(endpoint.enabled_events) ? "pass" : "fail",
      "stripe.webhook",
      `Webhook events: ${endpoint.enabled_events.join(", ")}`,
    );
  } catch (error: any) {
    addCheck(
      checks,
      "fail",
      "stripe.webhook",
      `Cannot retrieve webhook ${maskId(endpointId)}: ${error.message}`,
    );
  }
}

async function auditDatabaseLive(checks: Check[], env: EnvMap): Promise<void> {
  const databaseUrl = env.DATABASE_URL || env.SUPABASE_DB_URL || env.POSTGRES_URL;
  if (!databaseUrl) {
    addCheck(
      checks,
      "warn",
      "database.live",
      "No DATABASE_URL/SUPABASE_DB_URL/POSTGRES_URL configured; live DB catalog audit skipped",
    );
    return;
  }

  const { Client } = await import("pg");
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("supabase.co")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    await client.connect();
    const uniqueRows = await client.query<{ table_name: string; column_name: string }>(
      `
        select c.relname as table_name, a.attname as column_name
        from pg_constraint con
        join pg_class c on c.oid = con.conrelid
        join unnest(con.conkey) column_num on true
        join pg_attribute a on a.attrelid = c.oid and a.attnum = column_num
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and con.contype = 'u'
          and c.relname in ('credit_ledger', 'subscriptions')
      `,
    );

    const uniqueKeys = new Set(
      uniqueRows.rows.map((row) => `${row.table_name}.${row.column_name}`),
    );
    addCheck(
      checks,
      uniqueKeys.has("credit_ledger.idempotency_key") ? "pass" : "fail",
      "database.live",
      "credit_ledger.idempotency_key has a unique constraint",
    );
    addCheck(
      checks,
      uniqueKeys.has("subscriptions.stripe_subscription_id") ? "pass" : "fail",
      "database.live",
      "subscriptions.stripe_subscription_id has a unique constraint",
    );

    const policyRows = await client.query<{ tablename: string; policyname: string }>(
      `
        select tablename, policyname
        from pg_policies
        where schemaname = 'public'
          and tablename in ('subscriptions', 'credit_ledger', 'profiles')
      `,
    );
    const policies = new Set(
      policyRows.rows.map((row) => `${row.tablename}.${row.policyname}`),
    );
    for (const policy of [
      "profiles.profiles_select_own",
      "subscriptions.subscriptions_select_own",
      "credit_ledger.credit_ledger_select_own",
    ]) {
      addCheck(
        checks,
        policies.has(policy) ? "pass" : "fail",
        "database.live",
        `${policy} policy exists`,
      );
    }
  } catch (error: any) {
    addCheck(checks, "fail", "database.live", `Live DB catalog audit failed: ${error.message}`);
  } finally {
    await client.end().catch(() => undefined);
  }
}

function auditDatabaseSchemaSource(checks: Check[]): void {
  const path = "script/larpking-baseline.sql";
  if (!fs.existsSync(path)) {
    addCheck(checks, "warn", "database.schema", `${path} not found; source audit skipped`);
    return;
  }

  const sql = fs.readFileSync(path, "utf8");
  addCheck(
    checks,
    /idempotency_key text unique/i.test(sql) ? "pass" : "fail",
    "database.schema",
    "credit_ledger.idempotency_key is unique in baseline schema",
  );
  addCheck(
    checks,
    /stripe_subscription_id text not null unique/i.test(sql) ? "pass" : "fail",
    "database.schema",
    "subscriptions.stripe_subscription_id is unique in baseline schema",
  );
  for (const policy of [
    "profiles_select_own",
    "subscriptions_select_own",
    "credit_ledger_select_own",
  ]) {
    addCheck(
      checks,
      sql.includes(`create policy ${policy}`) ? "pass" : "fail",
      "database.schema",
      `${policy} policy exists in baseline schema`,
    );
  }
}

function printReport(checks: Check[], requireLive: boolean): void {
  const failCount = checks.filter((check) => check.status === "fail").length;
  const warnCount = checks.filter((check) => check.status === "warn").length;
  const passCount = checks.filter((check) => check.status === "pass").length;

  console.log(`Stripe audit (${requireLive ? "strict live" : "standard"})`);
  console.log(`Checks: ${passCount} pass, ${warnCount} warn, ${failCount} fail\n`);

  for (const check of checks) {
    const prefix =
      check.status === "pass" ? "[pass]" : check.status === "warn" ? "[warn]" : "[fail]";
    console.log(`${prefix} ${check.area}: ${check.message}`);
  }

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const { requireLive, envPath } = parseArgs();
  const env = {
    ...process.env,
    ...readEnvFile(envPath),
  };
  const checks: Check[] = [];

  await auditStripe(checks, env, requireLive);
  auditDatabaseSchemaSource(checks);
  await auditDatabaseLive(checks, env);
  printReport(checks, requireLive);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
