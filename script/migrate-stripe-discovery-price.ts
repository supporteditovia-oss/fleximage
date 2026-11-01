import fs from "node:fs";
import Stripe from "stripe";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  migrateDiscoverySubscriptionsTo990,
  resolveTargetDiscoveryPriceEur,
} = require("../api/_lib/stripe-discovery-reprice.js");

const ENV_PATH = ".env";

function readEnvFile(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(path)) return env;
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
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

function parseArgs(): { apply: boolean; envPath: string } {
  const args = process.argv.slice(2);
  const envPathIndex = args.indexOf("--env");
  return {
    apply: args.includes("--apply"),
    envPath:
      envPathIndex >= 0 && args[envPathIndex + 1]
        ? args[envPathIndex + 1]
        : ENV_PATH,
  };
}

async function main(): Promise<void> {
  const { apply, envPath } = parseArgs();
  const fileEnv = readEnvFile(envPath);
  const env = { ...process.env, ...fileEnv } as NodeJS.ProcessEnv;

  if (!env.STRIPE_SECRET_KEY) {
    throw new Error(`STRIPE_SECRET_KEY missing (${envPath})`);
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const targetPriceId = await resolveTargetDiscoveryPriceEur(stripe, env);
  console.log(`Target Discovery EUR price: ${targetPriceId} (9,90 €)`);

  const report = await migrateDiscoverySubscriptionsTo990(stripe, {
    dryRun: !apply,
    env,
  });

  console.log(JSON.stringify(report, null, 2));

  if (!apply) {
    console.log("\nDry-run only. Relance avec --apply pour migrer les abonnements.");
    console.log(
      "Ensuite: bun run vercel:sync-prices (si .env a le bon STRIPE_DISCOVERY_PRICE_ID).",
    );
  } else if (env.STRIPE_DISCOVERY_PRICE_ID !== targetPriceId) {
    console.warn(
      `\n⚠ STRIPE_DISCOVERY_PRICE_ID=${env.STRIPE_DISCOVERY_PRICE_ID} n'est pas le Price 9,90 €.`,
    );
    console.warn(`  Mets ${targetPriceId} dans .env + Vercel prod.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
