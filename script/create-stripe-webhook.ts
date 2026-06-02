import fs from "node:fs";
import Stripe from "stripe";

type EnvMap = Record<string, string>;

const ENV_PATH = ".env";
const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "invoice.paid",
  "customer.subscription.deleted",
  "customer.subscription.updated",
] as const;

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
      output += `${output.endsWith("\n") ? "" : "\n"}${line}\n`;
    }
  }

  fs.writeFileSync(ENV_PATH, output);
}

function isPublicHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function resolveWebhookUrl(env: EnvMap): string {
  const explicitUrl = env.STRIPE_WEBHOOK_URL?.trim();
  if (explicitUrl) return explicitUrl;

  const appUrl = env.APP_URL?.trim();
  if (!appUrl) {
    throw new Error(
      "APP_URL or STRIPE_WEBHOOK_URL must be set before creating a Stripe webhook.",
    );
  }

  return `${appUrl.replace(/\/+$/, "")}/api/stripe/webhook`;
}

function isPlaceholderSecret(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  return value.includes("your_") || value === "whsec_your_stripe_webhook_secret";
}

async function main(): Promise<void> {
  const { raw, env } = readEnvFile(ENV_PATH);
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is missing from .env");
  }

  const webhookUrl = resolveWebhookUrl(env);
  if (!isPublicHttpsUrl(webhookUrl)) {
    throw new Error(
      [
        `Stripe hosted webhooks require a public HTTPS URL, got: ${webhookUrl}`,
        "Set STRIPE_WEBHOOK_URL=https://your-domain.com/api/stripe/webhook or update APP_URL, then rerun bun run stripe:webhook.",
        "For local testing, use Stripe CLI: stripe listen --forward-to localhost:5000/api/stripe/webhook",
      ].join("\n"),
    );
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const existingEndpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = existingEndpoints.data.find(
    (endpoint) => endpoint.url === webhookUrl && endpoint.status === "enabled",
  );

  if (existing) {
    await stripe.webhookEndpoints.update(existing.id, {
      enabled_events: [...WEBHOOK_EVENTS],
      metadata: {
        ...existing.metadata,
        app: "larpking",
      },
      description: "LarpKing subscription lifecycle webhook",
    });

    if (isPlaceholderSecret(env.STRIPE_WEBHOOK_SECRET)) {
      throw new Error(
        [
          `Stripe webhook endpoint already exists: ${existing.id}`,
          "Stripe only reveals the signing secret when the endpoint is first created.",
          "Copy its signing secret from the Stripe Dashboard into STRIPE_WEBHOOK_SECRET, or delete the endpoint and rerun this script.",
        ].join("\n"),
      );
    }

    writeEnvValues(raw, {
      STRIPE_WEBHOOK_ENDPOINT_ID: existing.id,
      STRIPE_WEBHOOK_URL: webhookUrl,
    });
    console.log(`Stripe webhook endpoint updated: ${existing.id}`);
    console.log("Existing STRIPE_WEBHOOK_SECRET kept in .env");
    return;
  }

  const endpoint = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: [...WEBHOOK_EVENTS],
    description: "LarpKing subscription lifecycle webhook",
    metadata: {
      app: "larpking",
    },
  });

  if (!endpoint.secret) {
    throw new Error(
      `Stripe did not return a signing secret for webhook endpoint ${endpoint.id}`,
    );
  }

  writeEnvValues(raw, {
    STRIPE_WEBHOOK_SECRET: endpoint.secret,
    STRIPE_WEBHOOK_ENDPOINT_ID: endpoint.id,
    STRIPE_WEBHOOK_URL: webhookUrl,
  });

  console.log(`Stripe webhook endpoint created: ${endpoint.id}`);
  console.log(`Webhook URL: ${webhookUrl}`);
  console.log("Stripe webhook signing secret written to .env");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
