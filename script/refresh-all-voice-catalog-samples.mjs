#!/usr/bin/env node
/**
 * Rafraîchit tous les extraits catalogue (phrase unifiée si FISH_AUDIO_API_KEY).
 *
 * Usage: node script/refresh-all-voice-catalog-samples.mjs
 */
import { spawnSync } from "node:child_process";

const CATALOG = [
  ["maes", "22b7c6809d5d405aa6a5ae2402272b53"],
  ["gims", "d986afc13e7346ada353a747bce8a811"],
  ["damso", "cd8c1c3eead843c2b6b855cace16f520"],
  ["ninho", "3cfa191ad09b4cfea8e4eebc4c31c923"],
  ["booba", "82ec8e836aaf47aaae8bfb52f3d744b2"],
  ["jul", "66754cdcb9554e62bdff1ab6446dc78d"],
  ["sch", "d4b887e7013045bcba9bc9bb2fe2d3d5"],
  ["gazo", "0ff4b00e39e2429981b93bd7c6256d98"],
  ["niska", "6be490a175744894826dd464cf3a5004"],
  ["plk", "c9188f639648467f8f1c513b0dbac9f7"],
  ["kaaris", "30679093939d4335b780f6d45709de08"],
  ["sdm", "0a011b2e359e4b5580f0e46764795c3c"],
  ["tiakola", "38aca316167d449288bab317c60cd70b"],
];

for (const [slug, fishId] of CATALOG) {
  const result = spawnSync(
    process.execPath,
    ["script/refresh-voice-catalog-sample.mjs", slug, fishId],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Done — ${CATALOG.length} voix catalogue.`);
