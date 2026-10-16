#!/usr/bin/env node
/**
 * A/B Kling Motion : character_orientation video vs image
 * Usage:
 *   node script/motion-orientation-ab.mjs \
 *     --video "https://..." --image "https://..." \
 *     --prompt "Remplace la danseuse..." \
 *     --out /opt/cursor/artifacts/motion-ab-compare.html
 */
import fs from "fs/promises";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { loadDotenv } = await import("./load-dotenv.mjs");
loadDotenv(new URL("../.env", import.meta.url).pathname);

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || !process.argv[i + 1]) return null;
  return process.argv[i + 1];
}

const videoUrl = arg("video");
const imageUrl = arg("image");
const userPrompt = arg("prompt") || "";
const outPath =
  arg("out") ||
  `/opt/cursor/artifacts/motion-ab-compare-${Date.now()}.html`;
const userId = arg("user-id") || "motion-ab";

if (!videoUrl || !imageUrl) {
  console.error(
    "Usage: node script/motion-orientation-ab.mjs --video URL --image URL [--prompt text] [--out path.html]",
  );
  process.exit(1);
}

if (!process.env.KIE_AI_API_KEY) {
  console.error("KIE_AI_API_KEY manquant ( .env ou export ).");
  process.exit(1);
}

const { runMotionOrientationAbTest, buildMotionAbCompareHtml } = require(
  "../api/_lib/motion-orientation-ab.js",
);

console.info("[motion-ab] preparing shared composite + submitting 2 tasks…");
const payload = await runMotionOrientationAbTest({
  userId,
  subjectImageUrl: imageUrl,
  sourceVideoUrl: videoUrl,
  userPrompt,
  mode: "720p",
});

await fs.mkdir(path.dirname(outPath), { recursive: true });
const html = buildMotionAbCompareHtml(payload);
await fs.writeFile(outPath, html, "utf8");

console.info("[motion-ab] done");
console.info(JSON.stringify(payload.results, null, 2));
console.info(`Compare HTML: ${outPath}`);
