import fs from "node:fs";
import Stripe from "stripe";

type EnvMap = Record<string, string | undefined>;
type CheckStatus = "pass" | "warn" | "fail";

type Check = {
  status: CheckStatus;
  area: string;
  message: string;
};

type PlanDefinition = {
  key: "discovery" | "essential" | "ultimate";
  envKey: string;
  lookupKey: string;
  amount: number;
  credits: number;
};

const ENV_PATH = ".env";
const REQUIRED_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "invoice.paid",
  "customer.subscription.deleted",
  "customer.subscription.updated",
] as const;

const PLANS: PlanDefinition[] = [
  {
    key: "discovery",
    envKey: "STRIPE_DISCOVERY_PRICE_ID",
    lookupKey: "larpking_discovery_monthly_eur",
    amount: 890,
    credits: 2500,
  },
  {
    key: "essential",
    envKey: "STRIPE_ESSENTIAL_PRICE_ID",
    lookupKey: "larpking_essential_monthly_eur",
    amount: 1990,
    credits: 9500,
  },
  {
    key: "ultimate",
    envKey: "STRIPE_ULTIMATE_PRICE_ID",
    lookupKey: "larpking_ultimate_monthly_eur",
    amount: 3990,
    credits: 1_000_000,
  },
];

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

  for (const plan of PLANS) {
    const priceId = env[plan.envKey];
    if (!priceId) {
      addCheck(checks, "fail", `stripe.price.${plan.key}`, `${plan.envKey} is missing`);
      continue;
    }

    let price: Stripe.Price;
    try {
      price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
    } catch (error: any) {
      addCheck(
        checks,
        "fail",
        `stripe.price.${plan.key}`,
        `Cannot retrieve ${maskId(priceId)}: ${error.message}`,
      );
      continue;
    }

    const product =
      typeof price.product === "object" ? (price.product as Stripe.Product) : null;

    addCheck(
      checks,
      price.active ? "pass" : "fail",
      `stripe.price.${plan.key}`,
      `Price ${maskId(price.id)} active=${price.active}`,
    );
    addCheck(
      checks,
      requireLive && !price.livemode ? "fail" : "pass",
      `stripe.price.${plan.key}`,
      `Price livemode=${price.livemode}`,
    );
    addCheck(
      checks,
      price.currency === "eur" ? "pass" : "fail",
      `stripe.price.${plan.key}`,
      `Currency is ${price.currency}`,
    );
    addCheck(
      checks,
      price.unit_amount === plan.amount ? "pass" : "fail",
      `stripe.price.${plan.key}`,
      `Amount is ${price.unit_amount}`,
    );
    addCheck(
      checks,
      price.recurring?.interval === "month" ? "pass" : "fail",
      `stripe.price.${plan.key}`,
      `Recurring interval is ${price.recurring?.interval ?? "none"}`,
    );
    addCheck(
      checks,
      price.lookup_key === plan.lookupKey ? "pass" : "fail",
      `stripe.price.${plan.key}`,
      `Lookup key is ${price.lookup_key ?? "missing"}`,
    );
    addCheck(
      checks,
      price.metadata?.plan_type === plan.key ? "pass" : "fail",
      `stripe.price.${plan.key}`,
      `Metadata plan_type is ${price.metadata?.plan_type ?? "missing"}`,
    );
    addCheck(
      checks,
      price.metadata?.credits_per_cycle === String(plan.credits) ? "pass" : "fail",
      `stripe.price.${plan.key}`,
      `Metadata credits_per_cycle is ${price.metadata?.credits_per_cycle ?? "missing"}`,
    );

    if (!product) {
      addCheck(checks, "fail", `stripe.product.${plan.key}`, "Product is not expandable");
      continue;
    }

    addCheck(
      checks,
      product.active ? "pass" : "fail",
      `stripe.product.${plan.key}`,
      `Product active=${product.active}`,
    );
    addCheck(
      checks,
      requireLive && !product.livemode ? "fail" : "pass",
      `stripe.product.${plan.key}`,
      `Product livemode=${product.livemode}`,
    );
    addCheck(
      checks,
      product.metadata?.larpking_plan === plan.key ? "pass" : "fail",
      `stripe.product.${plan.key}`,
      `Product metadata larpking_plan is ${product.metadata?.larpking_plan ?? "missing"}`,
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
