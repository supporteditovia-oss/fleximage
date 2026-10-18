#!/usr/bin/env node
/**
 * Intègre paires démo Voix IA (MP3) + originale (MOV→MP4/MP3) pour le catalogue studio.
 *
 * Usage: node script/integrate-studio-voice-demos.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ffmpegPath = require("ffmpeg-static");
const catalogPath = path.join(process.cwd(), "shared/voice-catalog.json");
const demosDir = path.join(process.cwd(), "client/public/voices/demos");
const landingDir = path.join(process.cwd(), "client/public/assets/landing-voice-demos");
const samplesDir = path.join(process.cwd(), "client/public/assets/voice-catalog/samples");

/** Ordre : Niska, Kaaris, PLK, Damso — IA puis originale. */
const PAIRS = [
  {
    slug: "niska",
    ia: "C:\\Users\\Admin\\Downloads\\PTT-20261018T001300.mp3",
    original: "C:\\Users\\Admin\\AppData\\Local\\Temp\\copy_8B5CB702-132F-4041-939A-221D9FA653E5 (2).mov",
  },
  {
    slug: "kaaris",
    ia: "C:\\Users\\Admin\\Downloads\\PTT-20261018T001405.mp3",
    original:
      "C:\\Users\\Admin\\AppData\\Local\\Temp\\copy_D95DC8B6-D2DD-4F83-9D36-0AAA7E7410EF (5).mov",
  },
  {
    slug: "plk",
    ia: "C:\\Users\\Admin\\Downloads\\PTT-20261018T001452.mp3",
    original:
      "C:\\Users\\Admin\\AppData\\Local\\Temp\\copy_F7E6CE79-B8E4-4BD3-A2FD-E5FC6A639245 (5).mov",
  },
  {
    slug: "damso",
    ia: "C:\\Users\\Admin\\Downloads\\PTT-20261018T001541.mp3",
    original:
      "C:\\Users\\Admin\\AppData\\Local\\Temp\\copy_1722EC97-11FB-4333-B797-7BAEE410FDB5 (5).mov",
  },
];

await fs.mkdir(demosDir, { recursive: true });
await fs.mkdir(landingDir, { recursive: true });
await fs.mkdir(samplesDir, { recursive: true });

const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));

for (const { slug, ia, original } of PAIRS) {
  for (const p of [ia, original]) {
    try {
      await fs.access(p);
    } catch {
      console.error(`Fichier manquant: ${p}`);
      process.exit(1);
    }
  }

  const iaOut = path.join(demosDir, `${slug}-ia.mp3`);
  const mp4Out = path.join(demosDir, `${slug}-originale.mp4`);
  const origMp3 = path.join(demosDir, `${slug}-originale.mp3`);

  await fs.copyFile(ia, iaOut);
  await fs.copyFile(iaOut, path.join(landingDir, `${slug}.mp3`));
  await fs.copyFile(iaOut, path.join(samplesDir, `${slug}.mp3`));

  console.log(`[${slug}] IA → ${iaOut}`);

  const ffMp4 = spawnSync(
    ffmpegPath,
    [
      "-y",
      "-i",
      original,
      "-t",
      "30",
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
  if (ffMp4.status !== 0) process.exit(1);

  const ffMp3 = spawnSync(
    ffmpegPath,
    [
      "-y",
      "-i",
      original,
      "-t",
      "30",
      "-vn",
      "-acodec",
      "libmp3lame",
      "-b:a",
      "192k",
      origMp3,
    ],
    { stdio: "inherit" },
  );
  if (ffMp3.status !== 0) process.exit(1);

  console.log(`[${slug}] Originale → ${mp4Out}`);

  const idx = catalog.entries.findIndex((e) => e.slug === slug);
  if (idx < 0) {
    console.error(`Slug catalogue absent: ${slug}`);
    process.exit(1);
  }
  catalog.entries[idx] = {
    ...catalog.entries[idx],
    demoCloneAudio: `/voices/demos/${slug}-ia.mp3`,
    demoOriginalVideo: `/voices/demos/${slug}-originale.mp4`,
    demoOriginalAudio: `/voices/demos/${slug}-originale.mp3`,
    demoVideo: `/voices/demos/${slug}-originale.mp4`,
    studioPremium: true,
  };
}

const featuredOrder = ["gims", "maes", "niska", "kaaris", "plk", "damso"];
const bySlug = Object.fromEntries(catalog.entries.map((e) => [e.slug, e]));
const rest = catalog.entries.map((e) => e.slug).filter((s) => !featuredOrder.includes(s));
const slugs = [...featuredOrder, ...rest.filter((s) => !featuredOrder.includes(s))];
catalog.entries = slugs.map((s) => bySlug[s]).filter(Boolean);

await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log("voice-catalog.json mis à jour.");
console.log("Relance rebuild Fish si besoin: node script/rebuild-catalog-voice-from-file.mjs <slug> <mov>");
