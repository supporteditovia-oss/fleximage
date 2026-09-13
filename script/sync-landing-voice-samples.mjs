#!/usr/bin/env node
/** Copie landing-voice-demos → voice-catalog/samples (même intro personnalisée). */
import fs from "node:fs/promises";
import path from "node:path";

const srcDir = path.join(process.cwd(), "client/public/assets/landing-voice-demos");
const destDir = path.join(process.cwd(), "client/public/assets/voice-catalog/samples");

const files = await fs.readdir(srcDir);
let copied = 0;
for (const file of files.filter((name) => name.endsWith(".mp3"))) {
  await fs.copyFile(path.join(srcDir, file), path.join(destDir, file));
  copied += 1;
}
console.log(`[sync-landing-voice-samples] ${copied} fichiers synchronisés.`);
