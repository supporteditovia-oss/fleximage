import { spawnSync } from "node:child_process";
import fs from "node:fs";

const PRICE_ENV_KEYS = [
  "STRIPE_DISCOVERY_PRICE_ID",
  "STRIPE_ESSENTIAL_PRICE_ID",
  "STRIPE_ULTIMATE_PRICE_ID",
  "STRIPE_DISCOVERY_PRICE_ID_USD",
  "STRIPE_ESSENTIAL_PRICE_ID_USD",
  "STRIPE_ULTIMATE_PRICE_ID_USD",
  "STRIPE_PACK_MINI_PRICE_ID",
  "STRIPE_PACK_STANDARD_PRICE_ID",
  "STRIPE_PACK_PLUS_PRICE_ID",
  "STRIPE_PACK_MINI_PRICE_ID_USD",
  "STRIPE_PACK_STANDARD_PRICE_ID_USD",
  "STRIPE_PACK_PLUS_PRICE_ID_USD",
] as const;

function readEnvFile(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line) || !line.includes("=")) continue;
    const i = line.indexOf("=");
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[line.slice(0, i).trim()] = value;
  }
  return env;
}

function replaceProductionPriceId(key: string, value: string): void {
  const remove = spawnSync(
    "npx",
    ["vercel", "env", "rm", key, "production", "-y"],
    { stdio: "ignore", shell: true },
  );
  if (remove.error) throw remove.error;

  const result = spawnSync(
    "npx",
    ["vercel", "env", "add", key, "production"],
    { input: value, encoding: "utf8", shell: true },
  );
  if (result.status !== 0) {
    throw new Error(
      `Failed to update production environment variable ${key}: ${
        result.stderr || result.stdout || "unknown error"
      }`,
    );
  }
  console.log(`Updated production ${key}`);
}

function main(): void {
  if (!fs.existsSync(".env")) throw new Error(".env not found");
  const env = readEnvFile(".env");
  const missing = PRICE_ENV_KEYS.filter((key) => !env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing Stripe price IDs in .env: ${missing.join(", ")}`);
  }

  for (const key of PRICE_ENV_KEYS) {
    replaceProductionPriceId(key, env[key]);
  }
  console.log("All subscription and credit-pack Price IDs are synced to Vercel Production.");
}

main();
