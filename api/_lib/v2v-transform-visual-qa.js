/**
 * Reject V2V vehicle/cabin transforms that are nearly identical to the source
 * (e.g. only a gauge UI tweak while BMW logos remain).
 */
const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { isVehicleDrivingPrompt } = require("./video-studio");

let ffmpegPath = null;
try {
  ffmpegPath = require("ffmpeg-static");
} catch {
  ffmpegPath = null;
}

const execFileAsync = promisify(execFile);

function isV2VTransformVisualQaEnabled() {
  return String(process.env.V2V_TRANSFORM_VISUAL_QA || "1").trim() !== "0";
}

function getMinChangedPixelRatio() {
  const n = Number(process.env.V2V_TRANSFORM_MIN_CHANGED_PIXEL_RATIO);
  return Number.isFinite(n) && n > 0 && n < 1 ? n : 0.1;
}

function getMinMeanAbsDiff() {
  const n = Number(process.env.V2V_TRANSFORM_MIN_MEAN_ABS_DIFF);
  return Number.isFinite(n) && n > 0 && n < 1 ? n : 0.032;
}

function shouldRunV2VTransformVisualQa(meta, userPrompt) {
  if (!isV2VTransformVisualQaEnabled()) return false;
  if (!meta || meta.workflow !== "video_to_video") return false;
  if (!isVehicleDrivingPrompt(userPrompt || meta.prompt || "")) return false;
  return true;
}

async function downloadVideoToFile(videoUrl, destPath, timeoutMs = 90_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(videoUrl, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(destPath, buffer);
    return buffer.length;
  } finally {
    clearTimeout(timer);
  }
}

async function extractJpegFrameFromFile(inputPath, outputPath, seekSec) {
  await execFileAsync(
    ffmpegPath,
    [
      "-y",
      "-ss",
      String(Math.max(0, seekSec)),
      "-i",
      inputPath,
      "-frames:v",
      "1",
      "-q:v",
      "3",
      "-vf",
      "scale='min(640,iw)':-2",
      outputPath,
    ],
    { timeout: 90_000 },
  );
  return fs.readFile(outputPath);
}

/**
 * Compare two JPEG buffers (same scene size after resize).
 * @returns {{ meanAbsDiff: number, changedPixelRatio: number }}
 */
async function compareJpegFrames(jpegA, jpegB, sampleSize = 320) {
  const sharp = require("sharp");
  const size = sampleSize;
  const a = await sharp(jpegA)
    .resize(size, size, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();
  const b = await sharp(jpegB)
    .resize(size, size, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();
  const pixels = size * size;
  let sumDiff = 0;
  let changedPixels = 0;
  const channels = 3;
  for (let p = 0; p < pixels; p++) {
    const i = p * channels;
    const dr = Math.abs(a[i] - b[i]);
    const dg = Math.abs(a[i + 1] - b[i + 1]);
    const db = Math.abs(a[i + 2] - b[i + 2]);
    const maxD = Math.max(dr, dg, db);
    sumDiff += (dr + dg + db) / 3;
    if (maxD >= 22) changedPixels += 1;
  }
  return {
    meanAbsDiff: sumDiff / (pixels * 255),
    changedPixelRatio: changedPixels / pixels,
  };
}

function passesTransformVisualThresholds(metrics) {
  const minRatio = getMinChangedPixelRatio();
  const minMae = getMinMeanAbsDiff();
  if (metrics.changedPixelRatio >= minRatio) return true;
  if (metrics.meanAbsDiff >= minMae) return true;
  return false;
}

/**
 * @param {{ sourceVideoUrl: string, outputVideoUrl: string, seekSec?: number }}
 */
async function assessV2VTransformVisualChange({
  sourceVideoUrl,
  outputVideoUrl,
  seekSec = 0.45,
}) {
  if (!ffmpegPath) {
    return { pass: true, skipped: true, reason: "ffmpeg_unavailable" };
  }
  const src = String(sourceVideoUrl || "").trim();
  const out = String(outputVideoUrl || "").trim();
  if (!src.startsWith("http") || !out.startsWith("http")) {
    return { pass: true, skipped: true, reason: "missing_video_url" };
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "v2v-qa-"));
  const srcPath = path.join(tmpDir, "src.mp4");
  const outPath = path.join(tmpDir, "out.mp4");
  const srcJpg = path.join(tmpDir, "src.jpg");
  const outJpg = path.join(tmpDir, "out.jpg");

  try {
    await downloadVideoToFile(src, srcPath);
    await downloadVideoToFile(out, outPath);
    const [bufSrc, bufOut] = await Promise.all([
      extractJpegFrameFromFile(srcPath, srcJpg, seekSec),
      extractJpegFrameFromFile(outPath, outJpg, seekSec),
    ]);
    const metrics = await compareJpegFrames(bufSrc, bufOut);
    const pass = passesTransformVisualThresholds(metrics);
    return {
      pass,
      skipped: false,
      seekSec,
      metrics,
      thresholds: {
        minChangedPixelRatio: getMinChangedPixelRatio(),
        minMeanAbsDiff: getMinMeanAbsDiff(),
      },
    };
  } catch (err) {
    console.warn("[v2v-transform-visual-qa] assess failed", err?.message || err);
    return { pass: true, skipped: true, reason: "assess_error" };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = {
  isV2VTransformVisualQaEnabled,
  shouldRunV2VTransformVisualQa,
  compareJpegFrames,
  passesTransformVisualThresholds,
  assessV2VTransformVisualChange,
};
