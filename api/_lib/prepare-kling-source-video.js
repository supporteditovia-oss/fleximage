const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { uploadToR2 } = require("./r2");
const { VIDEO_V2V_MAX_DURATION_SEC } = require("./video-limits");

let ffmpegPath = null;
try {
  ffmpegPath = require("ffmpeg-static");
} catch {
  ffmpegPath = null;
}

const execFileAsync = promisify(execFile);

const KLING_READY_SUFFIX = "-motion-ready.mp4";

async function fetchUrlToFile(url, destPath, timeoutMs = 90_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw Object.assign(new Error("Impossible de lire la vidéo source"), {
        status: 422,
        code: "VIDEO_SOURCE_FETCH_FAILED",
      });
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(destPath, buffer);
    return buffer.length;
  } finally {
    clearTimeout(timer);
  }
}

function isLikelyKlingReadyMp4(url) {
  const text = String(url || "");
  return text.includes(KLING_READY_SUFFIX) && /\.mp4(\?|#|$)/i.test(text);
}

async function transcodeVideoForKlingMotion(inputPath, outputPath) {
  if (!ffmpegPath) {
    throw Object.assign(
      new Error("Préparation vidéo indisponible (ffmpeg)."),
      { status: 503, code: "FFMPEG_UNAVAILABLE" },
    );
  }
  await execFileAsync(
    ffmpegPath,
    [
      "-y",
      "-i",
      inputPath,
      "-t",
      String(VIDEO_V2V_MAX_DURATION_SEC),
      "-vf",
      "scale='min(720,iw)':-2",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ar",
      "44100",
      outputPath,
    ],
    { timeout: 180_000 },
  );
  const stat = await fs.stat(outputPath);
  if (!stat.size) {
    throw Object.assign(new Error("Transcodage vidéo vide"), {
      status: 422,
      code: "VIDEO_TRANSCODE_FAILED",
    });
  }
}

/**
 * KIE Motion Control n'accepte pas les MOV/HEVC iPhone tels quels — MP4 H.264 720p.
 */
async function resolveKlingMotionSourceVideoUrl(videoUrl, userId) {
  const url = String(videoUrl || "").trim();
  if (!url.startsWith("http")) {
    throw Object.assign(new Error("URL vidéo invalide"), {
      status: 422,
      code: "VIDEO_URL_INVALID",
    });
  }
  if (isLikelyKlingReadyMp4(url)) {
    return url;
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "kling-src-"));
  const inputPath = path.join(tmpDir, "source.bin");
  const outputPath = path.join(tmpDir, "ready.mp4");

  try {
    await fetchUrlToFile(url, inputPath);
    await transcodeVideoForKlingMotion(inputPath, outputPath);
    const outBuffer = await fs.readFile(outputPath);
    const key = `inputs/${userId}/${Date.now()}${KLING_READY_SUFFIX}`;
    return uploadToR2(key, outBuffer, "video/mp4");
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function normalizeMotionReferenceImageUrl(imageUrl, userId) {
  const url = String(imageUrl || "").trim();
  if (!url.startsWith("http")) return imageUrl;

  let contentType = "";
  try {
    const head = await fetch(url, { method: "HEAD" });
    contentType = String(head.headers.get("content-type") || "").split(";")[0].trim();
  } catch {
    contentType = "";
  }

  const isJpeg =
    /jpe?g/i.test(contentType) ||
    /\.jpe?g(\?|#|$)/i.test(url) ||
    url.includes("-motion-ref.jpg");
  if (isJpeg) return url;

  if (!ffmpegPath) {
    return url;
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "kling-ref-"));
  const inputPath = path.join(tmpDir, "ref.bin");
  const outputPath = path.join(tmpDir, "ref.jpg");

  try {
    await fetchUrlToFile(url, inputPath, 45_000);
    await execFileAsync(
      ffmpegPath,
      ["-y", "-i", inputPath, "-frames:v", "1", "-q:v", "3", outputPath],
      { timeout: 60_000 },
    );
    const jpeg = await fs.readFile(outputPath);
    if (!jpeg.length) return url;
    const key = `inputs/${userId}/${Date.now()}-motion-ref.jpg`;
    return uploadToR2(key, jpeg, "image/jpeg");
  } catch (err) {
    console.warn("[kling] reference image normalize failed", err);
    return url;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = {
  resolveKlingMotionSourceVideoUrl,
  normalizeMotionReferenceImageUrl,
  KLING_READY_SUFFIX,
};
