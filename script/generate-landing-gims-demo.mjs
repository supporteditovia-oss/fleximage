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
  buildLandingVoiceScript,
  resolveLandingVoiceEntry,
  LANDING_VOICE_DEFAULT_SLUG,
} = require("../api/_lib/landing-voice-demo.js");

const rapper = resolveLandingVoiceEntry(LANDING_VOICE_DEFAULT_SLUG);
const outPath = path.join(
  process.cwd(),
  "client/public/assets/landing-v2/gims-voice-demo.mp3",
);

let buffer;
try {
  buffer = await synthesizeSpeech({
    text: buildLandingVoiceScript(rapper),
    referenceId: rapper.fishId,
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
