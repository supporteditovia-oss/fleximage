#!/usr/bin/env node
/**
 * A/B local : upload fichiers → Kie → runMotionOrientationAbTest
 */
import fs from "fs/promises";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { loadDotenv } = await import("./load-dotenv.mjs");
loadDotenv(path.join(__dirname, "..", ".env"));
if (!process.env.KIE_AI_API_KEY && process.env.KIEAI_API_KEY) {
  process.env.KIE_AI_API_KEY = process.env.KIEAI_API_KEY;
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || !process.argv[i + 1]) return null;
  return process.argv[i + 1];
}

const videoPath = arg("video");
const imagePath = arg("image");
const userPrompt = arg("prompt") || "";
const outPath =
  arg("out") ||
  path.join(
    process.env.USERPROFILE || "",
    "Desktop",
    `motion-ab-compare-${Date.now()}.html`,
  );

if (!videoPath || !imagePath) {
  console.error(
    "Usage: node script/motion-orientation-ab-local.mjs --video PATH --image PATH",
  );
  process.exit(1);
}

if (!process.env.KIE_AI_API_KEY) {
  console.error("Définis KIE_AI_API_KEY (export ou .env).");
  process.exit(1);
}

const { uploadBufferToKie } = require("../api/_lib/kie-file-upload.js");
const { runMotionOrientationAbTest, buildMotionAbCompareHtml } = require(
  "../api/_lib/motion-orientation-ab.js",
);

const uploadPath = "luxeflexia-motion-ab";

console.info("[motion-ab-local] upload vidéo + photo vers Kie…");
const videoBuf = await fs.readFile(videoPath);
const imageBuf = await fs.readFile(imagePath);
const videoUrl = await uploadBufferToKie(videoBuf, {
  fileName: path.basename(videoPath),
  mimeType: videoPath.toLowerCase().endsWith(".mov")
    ? "video/quicktime"
    : "video/mp4",
  uploadPath,
});
const imageUrl = await uploadBufferToKie(imageBuf, {
  fileName: path.basename(imagePath),
  mimeType: "image/jpeg",
  uploadPath,
});
console.info("[motion-ab-local] composite + 2 tâches Kling…");

const payload = await runMotionOrientationAbTest({
  userId: "motion-ab-local",
  subjectImageUrl: imageUrl,
  sourceVideoUrl: videoUrl,
  userPrompt:
    userPrompt ||
    "Remplace la danseuse par la personne de ma photo. Corps entier, même pièce, même caméra.",
  mode: "720p",
});

await fs.writeFile(outPath, buildMotionAbCompareHtml(payload), "utf8");
console.info("[motion-ab-local] terminé");
console.info(JSON.stringify(payload.results, null, 2));
console.info(`Page comparaison : ${outPath}`);
