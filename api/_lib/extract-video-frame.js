const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { uploadToR2 } = require("./r2");

let ffmpegPath = null;
try {
  ffmpegPath = require("ffmpeg-static");
} catch {
  ffmpegPath = null;
}

const execFileAsync = promisify(execFile);

async function downloadVideoToFile(videoUrl, destPath, timeoutMs = 60_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(videoUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(destPath, buffer);
    return buffer.length;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extrait une frame JPEG (Kling Motion Control exige une image + la vidéo).
 */
async function extractReferenceFrameFromVideoUrl(videoUrl, userId) {
  if (!ffmpegPath) {
    throw Object.assign(
      new Error("Extraction frame vidéo indisponible (ffmpeg)."),
      { status: 503, code: "FFMPEG_UNAVAILABLE" },
    );
  }
  const url = String(videoUrl || "").trim();
  if (!url.startsWith("http")) {
    throw Object.assign(new Error("URL vidéo invalide"), {
      status: 422,
      code: "VIDEO_URL_INVALID",
    });
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "v2v-frame-"));
  const inputPath = path.join(tmpDir, "source.mp4");
  const framePath = path.join(tmpDir, "ref.jpg");

  try {
    await downloadVideoToFile(url, inputPath);
    await execFileAsync(
      ffmpegPath,
      [
        "-y",
        "-ss",
        "0.35",
        "-i",
        inputPath,
        "-frames:v",
        "1",
        "-q:v",
        "3",
        "-vf",
        "scale='min(1280,iw)':-2",
        framePath,
      ],
      { timeout: 90_000 },
    );
    const jpeg = await fs.readFile(framePath);
    if (!jpeg.length) {
      throw Object.assign(new Error("Impossible d'extraire une image de la vidéo"), {
        status: 422,
        code: "VIDEO_FRAME_EXTRACT_FAILED",
      });
    }
    const key = `inputs/${userId}/${Date.now()}-motion-ref.jpg`;
    return uploadToR2(key, jpeg, "image/jpeg");
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { extractReferenceFrameFromVideoUrl };
