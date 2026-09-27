#!/usr/bin/env node
/**
 * Applique les migrations CRM sur le projet Supabase lié à VITE_SUPABASE_URL.
 * Nécessite SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens).
 *
 * Usage: npm run crm:db:apply
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

const migrationsDir = path.resolve("supabase/migrations");
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => /^20260927.*\.sql$/.test(f))
  .sort();

if (!files.length) {
  console.error("Aucune migration CRM trouvée dans supabase/migrations/");
  process.exit(1);
}

for (const file of files) {
  const query = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  console.log("→", file);
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
  if (text && text !== "[]") console.log(text);
}

console.log("✓ Migrations CRM appliquées sur le projet", ref, `(${files.length} fichiers)`);
