#!/usr/bin/env node
/**
 * Génère l'extrait démo Maître Gims pour la landing (texte + voix catalogue).
 *
 * Usage:
 *   node script/generate-landing-gims-demo.mjs
 *   vercel env run --environment production -- node script/generate-landing-gims-demo.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { synthesizeSpeech } = require("../api/_lib/fish-audio.js");
const {
  LANDING_VOICE_DEMO_SCRIPT,
  LANDING_VOICE_GIMS_FISH_ID,
  LANDING_VOICE_DEMO_PUBLIC_PATH,
} = require("../api/_lib/landing-voice-demo.js");

const outPath = path.join(
  process.cwd(),
  "client/public",
  LANDING_VOICE_DEMO_PUBLIC_PATH.replace(/^\//, ""),
);

let buffer;
try {
  buffer = await synthesizeSpeech({
    text: LANDING_VOICE_DEMO_SCRIPT,
    referenceId: LANDING_VOICE_GIMS_FISH_ID,
    format: "mp3",
  });
} catch (err) {
  if (err?.code === "missing_fish_env") {
    console.warn("[landing-gims-demo] FISH_AUDIO_API_KEY absent — fichier statique ignoré.");
    process.exit(0);
  }
  throw err;
}

if (!buffer || buffer.length < 512) {
  console.warn("[landing-gims-demo] Synthèse vide — build continue sans MP3 statique.");
  process.exit(0);
}

await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, buffer);
console.log(`OK ${outPath} (${buffer.length} bytes)`);
