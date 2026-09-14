#!/usr/bin/env node
/**
 * Purge immédiate : générations réussies de plus de N jours (défaut 7).
 * Usage: node script/purge-retention-now.mjs [--days 7] [--batch 200]
 */
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  purgeExpiredGenerations,
  purgeGenerationsOlderThan,
} = require("../api/_lib/purge-generation.js");
const {
  purgeChurnedExSubscriberGenerations,
} = require("../api/_lib/purge-churned-users.js");

const daysArg = process.argv.find((a) => a.startsWith("--days="));
const batchArg = process.argv.find((a) => a.startsWith("--batch="));
const days = daysArg ? Number(daysArg.split("=")[1]) : 7;
const batch = batchArg ? Number(batchArg.split("=")[1]) : 200;

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

let totalPurged = 0;
let totalKeys = 0;

console.log(`[purge-retention] Purge expired (expires_at <= now)...`);
for (;;) {
  const r = await purgeExpiredGenerations(supabase, batch);
  totalPurged += r.purged;
  totalKeys += r.keys;
  console.log(`  batch expired: scanned=${r.scanned} purged=${r.purged}`);
  if (r.scanned < batch) break;
}

console.log(`[purge-retention] Purge older than ${days} days (created_at)...`);
for (;;) {
  const r = await purgeGenerationsOlderThan(supabase, days, batch);
  totalPurged += r.purged;
  totalKeys += r.keys;
  console.log(`  batch old: scanned=${r.scanned} purged=${r.purged} cutoff=${r.cutoffIso}`);
  if (r.scanned < batch) break;
}

console.log(
  `[purge-retention] Purge ex-abonnés résiliés + inactifs (>${days}j sans retour)...`,
);
let totalChurnUsers = 0;
let totalChurnGens = 0;
for (;;) {
  const r = await purgeChurnedExSubscriberGenerations(supabase, {
    userLimit: 50,
    genBatch: batch,
  });
  totalChurnUsers += r.usersPurged;
  totalChurnGens += r.generationsPurged;
  totalKeys += r.keys;
  console.log(
    `  batch churned: scannedUsers=${r.scannedUsers} usersPurged=${r.usersPurged} gens=${r.generationsPurged}`,
  );
  if (r.scannedUsers < 50) break;
}

console.log(
  `[purge-retention] Done. rows=${totalPurged} churnUsers=${totalChurnUsers} churnGens=${totalChurnGens} r2Keys=${totalKeys}`,
);
