#!/usr/bin/env node
/** Une génération Motion (orientation video) — test pipeline v4 */
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
  return i === -1 ? null : process.argv[i + 1];
}

const videoPath = arg("video");
const imagePath = arg("image");
const outDir = arg("out-dir") || path.join(process.env.USERPROFILE || "", "Desktop");

const { uploadBufferToKie } = require("../api/_lib/kie-file-upload.js");
const {
  prepareSharedMotionAbInputs,
  pollMotionAbTasks,
} = require("../api/_lib/motion-orientation-ab.js");
const { createKlingMotionTask } = require("../api/_lib/kie-kling-motion.js");

const videoBuf = await fs.readFile(videoPath);
const imageBuf = await fs.readFile(imagePath);
const videoUrl = await uploadBufferToKie(videoBuf, {
  fileName: path.basename(videoPath),
  mimeType: "video/mp4",
  uploadPath: "luxeflexia-motion-ab",
});
const imageUrl = await uploadBufferToKie(imageBuf, {
  fileName: path.basename(imagePath),
  mimeType: "image/jpeg",
  uploadPath: "luxeflexia-motion-ab",
});

const shared = await prepareSharedMotionAbInputs({
  userId: "motion-v4-test",
  subjectImageUrl: imageUrl,
  sourceVideoUrl: videoUrl,
  userPrompt:
    "Remplace la danseuse par la personne de ma photo. Corps entier, même pièce, pieds au sol.",
});

const kling = await createKlingMotionTask({
  prompt: shared.klingPrompt,
  inputUrls: [shared.kieImageUrl],
  videoUrls: [shared.kieVideoUrl],
  characterOrientation: "video",
  backgroundSource: shared.backgroundSource,
  mode: "720p",
});

const results = await pollMotionAbTasks({
  video: { taskId: kling.taskId },
});
const row = results.video;
console.info(JSON.stringify(row, null, 2));
if (row.videoUrl) {
  const res = await fetch(row.videoUrl);
  const buf = Buffer.from(await res.arrayBuffer());
  const dest = path.join(outDir, `motion-v4-${Date.now()}.mp4`);
  await fs.writeFile(dest, buf);
  console.info(`Saved: ${dest}`);
}
