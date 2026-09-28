const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { uploadToR2 } = require("./r2");
const { VIDEO_ALEPH_MAX_SOURCE_BYTES } = require("./video-limits");
const { pickAlephAspectFromDimensions } = require("./aleph-aspect-ratio");

/** Runway Aleph (Kie) ne traite que les ~5 premières secondes. */
const ALEPH_MAX_SOURCE_DURATION_SEC = 5;

let ffmpegPath = null;
try {
  ffmpegPath = require("ffmpeg-static");
} catch {
  ffmpegPath = null;
}

const execFileAsync = promisify(execFile);

async function probeRemoteVideoHead(videoUrl) {
  try {
    const head = await fetch(videoUrl, { method: "HEAD" });
    if (!head.ok) return { bytes: null, contentType: null };
    const len = Number(head.headers.get("content-length"));
    const bytes = Number.isFinite(len) && len > 0 ? len : null;
    const contentType = String(head.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    return { bytes, contentType: contentType || null };
  } catch {
    return { bytes: null, contentType: null };
  }
}

function urlLooksLikeMov(videoUrl) {
  return /\.mov(\?|#|$)/i.test(String(videoUrl || ""));
}

function needsAlephNormalize(videoUrl, contentType) {
  if (urlLooksLikeMov(videoUrl)) return true;
  if (contentType && /quicktime/.test(contentType)) return true;
  return false;
}

async function probeVideoDimensions(inputPath) {
  if (!ffmpegPath) return null;
  try {
    await execFileAsync(ffmpegPath, ["-hide_banner", "-i", inputPath], {
      timeout: 25_000,
    });
  } catch (err) {
    const text = `${err.stderr || ""}${err.stdout || ""}`;
    const match = text.match(/Video:.*? (\d{2,5})x(\d{2,5})/);
    if (match) {
      return { width: Number(match[1]), height: Number(match[2]) };
    }
  }
  return null;
}

async function transcodeForAleph(inputPath, outputPath) {
  if (!ffmpegPath) {
    throw Object.assign(new Error("Transcodage vidéo indisponible"), {
      status: 503,
      code: "FFMPEG_UNAVAILABLE",
    });
  }
  const crfSteps = [28, 32, 36];
  let lastErr = null;
  for (const crf of crfSteps) {
    try {
      await execFileAsync(
        ffmpegPath,
        [
          "-y",
          "-i",
          inputPath,
          "-t",
          String(ALEPH_MAX_SOURCE_DURATION_SEC),
          "-vf",
          "scale='min(720,iw)':-2",
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          String(crf),
          "-movflags",
          "+faststart",
          "-an",
          outputPath,
        ],
        { timeout: 120_000 },
      );
      const stat = await fs.stat(outputPath);
      if (stat.size <= VIDEO_ALEPH_MAX_SOURCE_BYTES) return stat.size;
      lastErr = new Error(`Encore trop lourd après transcodage (${stat.size} o)`);
    } catch (err) {
      lastErr = err;
    }
  }
  throw Object.assign(
    new Error(
      "Vidéo trop lourde pour le studio (max 10 Mo). Filme en 720p ou coupe la vidéo.",
    ),
    { status: 422, code: "VIDEO_TOO_HEAVY_FOR_ALEPH", cause: lastErr },
  );
}

/**
 * Runway Aleph (KIE) refuse les sources > 10 Mo. On transcode côté serveur si besoin.
 */
async function resolveAlephSourceVideoUrl(videoUrl, userId, options = {}) {
  const forceTranscode = options.forceTranscode !== false;
  const fallbackAspect = options.fallbackAspect || "16:9";
  const url = String(videoUrl || "").trim();
  if (!url.startsWith("http")) {
    throw Object.assign(new Error("URL vidéo invalide"), {
      status: 422,
      code: "VIDEO_URL_INVALID",
    });
  }

  const { bytes: remoteBytes, contentType: remoteType } =
    await probeRemoteVideoHead(url);
  const mustNormalize =
    forceTranscode || needsAlephNormalize(url, remoteType);
  if (
    !forceTranscode &&
    !mustNormalize &&
    remoteBytes != null &&
    remoteBytes <= VIDEO_ALEPH_MAX_SOURCE_BYTES
  ) {
    return { url, aspectRatio: fallbackAspect };
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "aleph-src-"));
  const inputPath = path.join(tmpDir, "source.bin");
  const outputPath = path.join(tmpDir, "aleph-ready.mp4");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    let response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      throw Object.assign(new Error("Impossible de lire la vidéo source"), {
        status: 422,
        code: "VIDEO_SOURCE_FETCH_FAILED",
      });
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const fetchedType = String(response.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (
      !forceTranscode &&
      !mustNormalize &&
      !needsAlephNormalize(url, fetchedType) &&
      buffer.length <= VIDEO_ALEPH_MAX_SOURCE_BYTES
    ) {
      return { url, aspectRatio: fallbackAspect };
    }
    await fs.writeFile(inputPath, buffer);
    const dims = await probeVideoDimensions(inputPath);
    await transcodeForAleph(inputPath, outputPath);
    const outDims = (await probeVideoDimensions(outputPath)) || dims;
    const aspectRatio = pickAlephAspectFromDimensions(
      outDims?.width,
      outDims?.height,
      fallbackAspect,
    );
    const outBuffer = await fs.readFile(outputPath);
    const key = `inputs/${userId}/${Date.now()}-aleph.mp4`;
    const uploaded = await uploadToR2(key, outBuffer, "video/mp4");
    return { url: uploaded, aspectRatio };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = {
  resolveAlephSourceVideoUrl,
  VIDEO_ALEPH_MAX_SOURCE_BYTES,
  ALEPH_MAX_SOURCE_DURATION_SEC,
  pickAlephAspectFromDimensions,
  probeVideoDimensions,
};
