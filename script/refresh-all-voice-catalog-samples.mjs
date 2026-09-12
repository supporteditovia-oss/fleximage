#!/usr/bin/env node
/**
 * Rafraîchit tous les extraits catalogue (phrase unifiée si FISH_AUDIO_API_KEY).
 *
 * Usage: node script/refresh-all-voice-catalog-samples.mjs
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const catalog = require("../shared/voice-catalog.json");

for (const entry of catalog.entries) {
  const result = spawnSync(
    process.execPath,
    ["script/refresh-voice-catalog-sample.mjs", entry.slug, entry.fishId],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Done — ${catalog.entries.length} voix catalogue.`);
