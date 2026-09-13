#!/usr/bin/env node
/**
 * Génère les extraits démo landing (intro personnalisée par voix).
 *
 * Usage:
 *   node script/generate-landing-voice-demos.mjs
 *   node script/generate-landing-voice-demos.mjs --slug gims
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { synthesizeSpeech } = require("../api/_lib/fish-audio.js");
const {
  buildLandingVoiceScript,
  LANDING_VOICE_CATALOG,
} = require("../api/_lib/landing-voice-demo.js");
const { humanizeVoiceScript } = require("../api/_lib/voice-humanize.js");

const outDir = path.join(process.cwd(), "client/public/assets/landing-voice-demos");
const slugArg = process.argv.find((arg) => arg.startsWith("--slug="))?.split("=")[1];
const onlySlug = slugArg?.trim().toLowerCase();

const entries = LANDING_VOICE_CATALOG.filter((entry) =>
  onlySlug ? entry.slug === onlySlug : true,
);

if (entries.length === 0) {
  console.error("[landing-voice-demos] Aucune voix à générer.");
  process.exit(1);
}

await fs.mkdir(outDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const force = process.argv.includes("--force");

for (const entry of entries) {
  const outPath = path.join(outDir, `${entry.slug}.mp3`);

  if (!force) {
    try {
      const existing = await fs.stat(outPath);
      if (existing.size >= 512) {
        console.log(`SKIP ${entry.slug} (déjà présent)`);
        continue;
      }
    } catch {
      /* générer */
    }
  }

  const script = buildLandingVoiceScript(entry);
  const { fishText } = humanizeVoiceScript(script, { voiceName: entry.name });

  try {
    const buffer = await synthesizeSpeech({
      text: fishText,
      referenceId: entry.fishId,
      format: "mp3",
      speed: entry.rate,
    });

    if (!buffer || buffer.length < 512) {
      console.warn(`[landing-voice-demos] ${entry.slug}: synthèse vide — ignoré.`);
      continue;
    }

    await fs.writeFile(outPath, buffer);
    console.log(`OK ${entry.slug} → ${outPath} (${buffer.length} bytes)`);
  } catch (err) {
    if (err?.code === "missing_fish_env") {
      console.warn("[landing-voice-demos] FISH_AUDIO_API_KEY absent — build continue sans MP3.");
      process.exit(0);
    }
    console.error(`[landing-voice-demos] ${entry.slug}: ${err.message || err}`);
  }

  await sleep(800);
}
