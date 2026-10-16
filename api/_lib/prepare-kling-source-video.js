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

async function transcodeVideoForKlingMotion(
  inputPath,
  outputPath,
  { preserveSourceAudio = false } = {},
) {
  if (!ffmpegPath) {
    throw Object.assign(
      new Error("Préparation vidéo indisponible (ffmpeg)."),
      { status: 503, code: "FFMPEG_UNAVAILABLE" },
    );
  }
  const args = [
    "-y",
    "-i",
    inputPath,
    "-t",
    String(VIDEO_V2V_MAX_DURATION_SEC),
    "-vf",
    "scale='if(lt(iw,720),720,min(iw,1280))':-2:flags=lanczos",
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
  ];
  if (preserveSourceAudio) {
    args.push("-c:a", "aac", "-b:a", "128k", "-ar", "44100");
  } else {
    args.push("-an");
  }
  args.push(outputPath);

  await execFileAsync(ffmpegPath, args, { timeout: 180_000 });
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
async function resolveKlingMotionSourceVideoUrl(
  videoUrl,
  userId,
  { preserveSourceAudio = false } = {},
) {
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
    await transcodeVideoForKlingMotion(inputPath, outputPath, {
      preserveSourceAudio,
    });
    const outBuffer = await fs.readFile(outputPath);
    const key = `inputs/${userId}/${Date.now()}${KLING_READY_SUFFIX}`;
    return uploadToR2(key, outBuffer, "video/mp4");
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

const OMNI_READY_SUFFIX = "-omni-ready.mp4";

/** Côté court ramené entre 720 et 1080 px (Omni refuse les sources trop petites, 4K inutile en entrée). */
const OMNI_SCALE_FILTER =
  "scale=w='if(lte(iw,ih),min(max(iw,720),1080),-2)':h='if(lte(iw,ih),-2,min(max(ih,720),1080))',setsar=1";

/**
 * Kling 3.0 Omni : MOV/HEVC/HDR iPhone et clips recompressés → MP4 H.264 8 bits propre.
 */
async function resolveOmniSourceVideoUrl(videoUrl, userId) {
  const url = String(videoUrl || "").trim();
  if (!url.startsWith("http")) {
    throw Object.assign(new Error("URL vidéo invalide"), {
      status: 422,
      code: "VIDEO_URL_INVALID",
    });
  }
  if (url.includes(OMNI_READY_SUFFIX)) return url;
  if (!ffmpegPath) return url;

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "omni-src-"));
  const inputPath = path.join(tmpDir, "source.bin");
  const outputPath = path.join(tmpDir, "omni-ready.mp4");
  try {
    await fetchUrlToFile(url, inputPath);
    await execFileAsync(
      ffmpegPath,
      [
        "-y",
        "-i",
        inputPath,
        "-t",
        String(VIDEO_V2V_MAX_DURATION_SEC),
        "-vf",
        OMNI_SCALE_FILTER,
        "-r",
        "30",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
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
    const outBuffer = await fs.readFile(outputPath);
    if (!outBuffer.length) {
      throw Object.assign(new Error("Transcodage vidéo vide"), {
        status: 422,
        code: "VIDEO_TRANSCODE_FAILED",
      });
    }
    const key = `inputs/${userId}/${Date.now()}${OMNI_READY_SUFFIX}`;
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
  resolveOmniSourceVideoUrl,
  normalizeMotionReferenceImageUrl,
  KLING_READY_SUFFIX,
  OMNI_READY_SUFFIX,
  OMNI_SCALE_FILTER,
};
