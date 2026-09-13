#!/usr/bin/env node
/**
 * Copie les MP3 landing (intro personnalisée) vers voice-catalog/samples
 * pour compatibilité ancien bundle + priorité statique Vercel sur les rewrites.
 */
import fs from "node:fs/promises";
import path from "node:path";

const srcDir = path.join(process.cwd(), "client/public/assets/landing-voice-demos");
const destDir = path.join(process.cwd(), "client/public/assets/voice-catalog/samples");

await fs.mkdir(destDir, { recursive: true });

const files = (await fs.readdir(srcDir)).filter((name) => name.endsWith(".mp3"));

if (files.length === 0) {
  console.warn("[sync-landing-voice-samples] Aucun MP3 source — skip.");
  process.exit(0);
}

for (const file of files) {
  await fs.copyFile(path.join(srcDir, file), path.join(destDir, file));
}

console.log(`[sync-landing-voice-samples] ${files.length} MP3 → voice-catalog/samples/`);
