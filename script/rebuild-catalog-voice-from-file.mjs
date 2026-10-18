#!/usr/bin/env node
/**
 * Modèle Fish + MP3 catalogue + MP4 démo studio depuis audio/vidéo locale.
 *
 * Usage:
 *   node script/rebuild-catalog-voice-from-file.mjs niska "C:\path\ref.mov"
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

const ffmpegPath = require("ffmpeg-static");

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
const ext = path.extname(resolvedMedia).toLowerCase();
const stat = await fs.stat(resolvedMedia);
let wav;

const voicesDir = path.join(process.cwd(), "client/public/voices");
const landingDir = path.join(process.cwd(), "client/public/assets/landing-voice-demos");
const samplesDir = path.join(process.cwd(), "client/public/assets/voice-catalog/samples");
await fs.mkdir(voicesDir, { recursive: true });
await fs.mkdir(landingDir, { recursive: true });
await fs.mkdir(samplesDir, { recursive: true });

const mp4Out = path.join(voicesDir, `${slug}.mp4`);
const mp3Landing = path.join(landingDir, `${slug}.mp3`);
const mp3Sample = path.join(samplesDir, `${slug}.mp3`);

if ([".mov", ".mp4", ".webm", ".mkv", ".m4v"].includes(ext)) {
  console.log(`MP4 démo → ${mp4Out}`);
  const ffVid = spawnSync(
    ffmpegPath,
    [
      "-y",
      "-i",
      resolvedMedia,
      "-t",
      String(Math.min(30, Math.max(0.5, durationSec))),
      "-c:v",
      "libx264",
      "-crf",
      "22",
      "-preset",
      "fast",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      mp4Out,
    ],
    { stdio: "inherit" },
  );
  if (ffVid.status !== 0) {
    console.error("ffmpeg mp4 failed");
    process.exit(1);
  }

  console.log(`MP3 aperçu (piste audio démo) → ${mp3Landing}`);
  const ffMp3 = spawnSync(
    ffmpegPath,
    [
      "-y",
      "-i",
      resolvedMedia,
      "-t",
      String(Math.min(30, Math.max(0.5, durationSec))),
      "-vn",
      "-acodec",
      "libmp3lame",
      "-b:a",
      "192k",
      "-ar",
      "44100",
      mp3Landing,
    ],
    { stdio: "inherit" },
  );
  if (ffMp3.status !== 0) {
    console.error("ffmpeg mp3 failed");
    process.exit(1);
  }
  await fs.copyFile(mp3Landing, mp3Sample);

  if (stat.size > 25 * 1024 * 1024) {
    const tmpWav = path.join(voicesDir, `.${slug}-train.wav`);
    const ffWav = spawnSync(
      ffmpegPath,
      [
        "-y",
        "-i",
        resolvedMedia,
        "-t",
        String(Math.min(25, Math.max(0.5, durationSec))),
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "44100",
        "-ac",
        "1",
        tmpWav,
      ],
      { stdio: "inherit" },
    );
    if (ffWav.status !== 0) process.exit(1);
    wav = await fs.readFile(tmpWav);
    await fs.unlink(tmpWav).catch(() => {});
  } else {
    const raw = await fs.readFile(resolvedMedia);
    wav = await extractVoiceSampleWavFromVideoBuffer(raw, { durationSec });
  }
} else {
  const raw = await fs.readFile(resolvedMedia);
  wav = raw;
}

if (!wav?.length || wav.length < 2048) {
  console.error("Échantillon audio trop court.");
  process.exit(1);
}

let transcript = null;
try {
  transcript = await transcribeAudio(wav, "fr");
} catch (asrErr) {
  console.warn("ASR ignoré:", asrErr?.message || asrErr);
}

console.log("Création modèle Fish (fast, enhance)…");
const model = await createVoiceModel({
  title: `LuxeFlexIA Studio — ${entry.name}`,
  description: `Catalogue ${slug} — référence premium ${path.basename(resolvedMedia)}`,
  audioBuffers: [wav],
  texts: transcript ? [transcript] : undefined,
  trainMode: "fast",
  enhanceAudioQuality: true,
});

const fishId = model.id;
console.log(`Modèle: ${fishId} (${model.state})`);

if (String(model.state).toLowerCase() !== "trained") {
  await waitForVoiceModelReady(fishId, { timeoutMs: 180_000 });
}

const previousFishId = entry.fishId;
catalog.entries[entryIndex] = {
  ...entry,
  fishId,
  demoVideo: entry.demoOriginalVideo || `/voices/demos/${slug}-originale.mp4`,
  studioPremium: true,
  demoCloneAudio: entry.demoCloneAudio,
  demoOriginalVideo: entry.demoOriginalVideo,
  demoOriginalAudio: entry.demoOriginalAudio,
};
await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`${slug} fishId ${previousFishId} → ${fishId}`);
console.log(`Terminé — dépose OK: public/voices/${slug}.mp4`);
