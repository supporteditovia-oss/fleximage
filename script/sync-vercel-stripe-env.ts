/**
 * Push Stripe/Supabase server env from local .env to Vercel Production.
 * Usage (once logged in): bun run script/sync-vercel-stripe-env.ts
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const ENV_KEYS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_DISCOVERY_PRICE_ID",
  "STRIPE_ESSENTIAL_PRICE_ID",
  "STRIPE_ULTIMATE_PRICE_ID",
  "VITE_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SITE_URL",
  "APP_URL",
  "VITE_PUBLIC_APP_URL",
] as const;

function readEnvFile(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line) || !line.includes("=")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

function upsertEnv(key: string, value: string): void {
  // Remove existing production value if present, then add.
  spawnSync("npx", ["vercel", "env", "rm", key, "production", "-y"], {
    stdio: "ignore",
    shell: true,
  });
  const result = spawnSync(
    "npx",
    ["vercel", "env", "add", key, "production"],
    {
      input: value,
      encoding: "utf8",
      shell: true,
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `Failed to set ${key}: ${result.stderr || result.stdout || "unknown error"}`,
    );
  }
  console.log(`OK ${key}`);
}

function main() {
  if (!fs.existsSync(".env")) {
    throw new Error(".env not found");
  }
  const env = readEnvFile(".env");
  if (!env.VITE_PUBLIC_APP_URL) {
    env.VITE_PUBLIC_APP_URL = env.SITE_URL || "https://www.luxeflexia.com";
  }
  if (!env.APP_URL || env.APP_URL.includes("localhost")) {
    env.APP_URL = env.SITE_URL || "https://www.luxeflexia.com";
  }

  for (const key of ENV_KEYS) {
    const value = env[key]?.trim();
    if (!value) {
      console.warn(`SKIP ${key} (missing in .env)`);
      continue;
    }
    upsertEnv(key, value);
  }

  console.log("Done. Redeploy the project so serverless functions pick up the env.");
}

main();
