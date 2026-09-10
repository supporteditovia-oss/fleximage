#!/usr/bin/env node
/**
 * Télécharge l'extrait officiel Fish Audio d'un modèle catalogue
 * et l'enregistre dans client/public/assets/voice-catalog/samples/{slug}.mp3
 *
 * Usage:
 *   node script/refresh-voice-catalog-sample.mjs maes 22b7c6809d5d405aa6a5ae2402272b53
 */
import fs from "node:fs/promises";
import path from "node:path";

const [slug, fishId] = process.argv.slice(2);
if (!slug || !fishId) {
  console.error(
    "Usage: node script/refresh-voice-catalog-sample.mjs <slug> <fish_model_id>",
  );
  process.exit(1);
}

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

const buffer = Buffer.from(await audioRes.arrayBuffer());
const outPath = path.join(
  process.cwd(),
  "client/public/assets/voice-catalog/samples",
  `${slug}.mp3`,
);
await fs.writeFile(outPath, buffer);
console.log(
  `OK ${slug}.mp3 (${buffer.length} bytes) — ${model.title || fishId}`,
);
