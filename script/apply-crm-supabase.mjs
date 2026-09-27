#!/usr/bin/env node
/**
 * Applique la migration CRM sur le projet Supabase lié à VITE_SUPABASE_URL.
 * Nécessite SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens).
 *
 * Usage: node script/apply-crm-supabase.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { loadDotenv } from "./load-dotenv.mjs";

loadDotenv(process.env.ENV_FILE || ".env");

const url = process.env.VITE_SUPABASE_URL?.trim();
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!url || !token) {
  console.error(
    "VITE_SUPABASE_URL et SUPABASE_ACCESS_TOKEN requis pour appliquer le SQL automatiquement.",
  );
  process.exit(1);
}

const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!ref) {
  console.error("Impossible d’extraire le project ref depuis VITE_SUPABASE_URL");
  process.exit(1);
}

const sqlPath = path.resolve(
  "supabase/migrations/20260927120000_crm_core_tables_and_seed.sql",
);
const query = fs.readFileSync(sqlPath, "utf8");

const res = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  },
);

const text = await res.text();
if (!res.ok) {
  console.error("Échec Supabase SQL API:", res.status, text);
  process.exit(1);
}

console.log("✓ Migration CRM appliquée sur le projet", ref);
if (text) console.log(text);
