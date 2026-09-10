#!/usr/bin/env node
/**
 * Génère ou télécharge l'extrait catalogue d'une voix Fish Audio.
 *
 * Préfère la synthèse TTS avec la phrase catalogue unifiée (FISH_AUDIO_API_KEY).
 * Repli : extrait par défaut du modèle Fish.
 *
 * Usage:
 *   node script/refresh-voice-catalog-sample.mjs niska 6be490a175744894826dd464cf3a5004
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { CATALOG_SAMPLE_LINE } = require("../api/_lib/voice-catalog.js");
const { synthesizeSpeech } = require("../api/_lib/fish-audio.js");

const [slug, fishId] = process.argv.slice(2);
if (!slug || !fishId) {
  console.error(
    "Usage: node script/refresh-voice-catalog-sample.mjs <slug> <fish_model_id>",
  );
  process.exit(1);
}

const outPath = path.join(
  process.cwd(),
  "client/public/assets/voice-catalog/samples",
  `${slug}.mp3`,
);

let buffer = null;
let source = "fish-default-sample";

try {
  buffer = await synthesizeSpeech({
    text: CATALOG_SAMPLE_LINE,
    referenceId: fishId,
    format: "mp3",
  });
  source = "fish-tts-unified";
} catch (err) {
  console.warn("TTS unified failed, fallback model sample:", err.message || err);
}

if (!buffer || buffer.length < 512) {
  const modelRes = await fetch(
    `https://api.fish.audio/model/${encodeURIComponent(fishId)}`,
  );
  if (!modelRes.ok) {
    console.error("Fish model fetch failed:", modelRes.status);
    process.exit(1);
  }
  const model = await modelRes.json();
  const sampleUrl = model?.samples?.[0]?.audio;
  if (!sampleUrl) {
    console.error("No sample audio on model", model?.title || fishId);
    process.exit(1);
  }
  const audioRes = await fetch(sampleUrl);
  if (!audioRes.ok) {
    console.error("Sample download failed:", audioRes.status);
    process.exit(1);
  }
  buffer = Buffer.from(await audioRes.arrayBuffer());
}

await fs.writeFile(outPath, buffer);
console.log(`OK ${slug}.mp3 (${buffer.length} bytes) — ${source}`);
