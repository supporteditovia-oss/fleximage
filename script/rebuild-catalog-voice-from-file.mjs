#!/usr/bin/env node
/**
 * Recrée un modèle Fish Audio catalogue à partir d’un extrait audio/vidéo local,
 * met à jour shared/voice-catalog.json (fishId) et régénère l’MP3 d’aperçu.
 *
 * Usage:
 *   node script/rebuild-catalog-voice-from-file.mjs niska "C:\path\reference.mov"
 */
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { loadDotenv } from "./load-dotenv.mjs";

const require = createRequire(import.meta.url);
const catalogPath = path.join(process.cwd(), "shared/voice-catalog.json");
const {
  createVoiceModel,
  waitForVoiceModelReady,
  transcribeAudio,
} = require("../api/_lib/fish-audio.js");
const { extractVoiceSampleWavFromVideoBuffer } = require("../api/_lib/extract-audio-from-video-buffer.js");

loadDotenv(path.join(process.cwd(), ".env"));
loadDotenv(path.join(process.cwd(), ".env.local"));

const [slug, mediaPath, durationArg] = process.argv.slice(2);
if (!slug || !mediaPath) {
  console.error(
    "Usage: node script/rebuild-catalog-voice-from-file.mjs <catalog-slug> <audio-or-video-path> [durationSec]",
  );
  process.exit(1);
}

const durationSec = durationArg ? Number(durationArg) : 25;
const resolvedMedia = path.resolve(mediaPath);

const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
const entryIndex = catalog.entries.findIndex((e) => e.slug === slug);
if (entryIndex < 0) {
  console.error(`Slug catalogue inconnu: ${slug}`);
  process.exit(1);
}

const entry = catalog.entries[entryIndex];
const raw = await fs.readFile(resolvedMedia);
let wav = raw;
const ext = path.extname(resolvedMedia).toLowerCase();
if ([".mov", ".mp4", ".webm", ".mkv", ".m4v"].includes(ext)) {
  console.log(`Extraction audio (${durationSec}s max) depuis ${resolvedMedia}…`);
  wav = await extractVoiceSampleWavFromVideoBuffer(raw, { durationSec });
} else if (![".wav", ".mp3", ".m4a", ".aac", ".ogg"].includes(ext)) {
  console.warn(`Extension ${ext} — tentative comme WAV brut`);
}

if (!wav?.length || wav.length < 2048) {
  console.error("Échantillon audio trop court ou vide.");
  process.exit(1);
}

let transcript = null;
try {
  console.log(`Transcription Fish ASR (${wav.length} octets)…`);
  transcript = await transcribeAudio(wav, "fr");
  console.log(`Transcription (${transcript.length} car.): ${transcript.slice(0, 120)}…`);
} catch (asrErr) {
  const lowCredit =
    asrErr?.status === 402 || /insufficient api credit/i.test(String(asrErr?.message || ""));
  console.warn(
    lowCredit
      ? "ASR ignoré (crédit API Fish) — création du modèle sans texte aligné."
      : `ASR ignoré: ${asrErr?.message || asrErr}`,
  );
}

console.log("Création modèle Fish (fast)…");
const model = await createVoiceModel({
  title: `LuxeFlexIA — ${entry.name}`,
  description: `Catalogue ${slug} — référence locale ${path.basename(resolvedMedia)}`,
  audioBuffers: [wav],
  texts: transcript ? [transcript] : undefined,
  trainMode: "fast",
  enhanceAudioQuality: true,
});

const fishId = model.id;
console.log(`Modèle créé: ${fishId} (état: ${model.state})`);

if (String(model.state).toLowerCase() !== "trained") {
  console.log("Attente entraînement…");
  const ready = await waitForVoiceModelReady(fishId, { timeoutMs: 120_000 });
  if (!ready) {
    console.warn("Timeout entraînement — le fishId est enregistré quand même.");
  } else {
    console.log("Modèle prêt (trained).");
  }
}

const previousFishId = entry.fishId;
catalog.entries[entryIndex] = { ...entry, fishId };
await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`voice-catalog.json: ${slug} fishId ${previousFishId} → ${fishId}`);

const refresh = spawnSync(
  process.execPath,
  ["script/refresh-voice-catalog-sample.mjs", slug, fishId],
  { stdio: "inherit", cwd: process.cwd() },
);

if (refresh.status !== 0) {
  process.exit(refresh.status ?? 1);
}

console.log(`Terminé — voix ${entry.name} alignée sur ${path.basename(resolvedMedia)}.`);
