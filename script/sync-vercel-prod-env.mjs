#!/usr/bin/env node
/**
 * Pousse les clés API (DeepInfra, Kie) vers Vercel Production — projet luxeflexia.
 * Lit d'abord `.env` à la racine du repo (ton fichier local), puis les variables d'environnement.
 *
 * Usage local (recommandé si tu as tout dans .env) :
 *   node script/sync-vercel-prod-env.mjs
 *
 * Usage agent (secrets Cursor : VERCEL_TOKEN + DEEPINFRA_API_KEY + KIE_AI_API_KEY) :
 *   node script/sync-vercel-prod-env.mjs
 */
import { spawnSync } from "node:child_process";
import { loadDotenv } from "./load-dotenv.mjs";

const envFile = process.env.ENV_FILE || ".env";
const dot = loadDotenv(envFile);
if (dot.loaded > 0) {
  console.log(`Chargé ${dot.loaded} variable(s) depuis ${dot.path}`);
} else if (process.env.ENV_FILE) {
  console.warn(`Aucune variable chargée depuis ${dot.path}`);
}

const PROJECT = "luxeflexia";
const TARGET = "production";

const VARS = [
  { name: "DEEPINFRA_API_KEY", required: false },
  { name: "DEEPINFRA_MODEL", required: false, defaultValue: "google/nano-banana-2" },
  { name: "KIE_AI_API_KEY", required: false },
];

function runVercel(args, stdin) {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) {
    console.error("VERCEL_TOKEN manquant — crée un token sur vercel.com/account/tokens");
    process.exit(1);
  }
  const fullArgs = [...args, "--token", token, "--yes"];
  const result = spawnSync("npx", ["vercel@60.0.0", ...fullArgs], {
    input: stdin,
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function upsertEnv(name, value) {
  if (!value?.trim()) {
    console.log(`⊘ ${name} — absent, ignoré`);
    return;
  }
  console.log(`▶ ${name} → Vercel ${PROJECT} (${TARGET})`);
  runVercel(
    ["env", "add", name, TARGET, "--force", "--project", PROJECT],
    value.trim(),
  );
}

console.log(`\nSync env → ${PROJECT} (${TARGET})\n`);

for (const spec of VARS) {
  const raw = process.env[spec.name] ?? spec.defaultValue ?? "";
  if (spec.required && !String(raw).trim()) {
    console.error(`Variable requise manquante : ${spec.name}`);
    process.exit(1);
  }
  upsertEnv(spec.name, String(raw));
}

console.log("\n▶ Redéploiement production…");
runVercel(["deploy", "--prod", "--project", PROJECT]);

console.log("\n✓ Terminé. Vérifie Admin → Clés API (runtime Vercel prod).\n");
