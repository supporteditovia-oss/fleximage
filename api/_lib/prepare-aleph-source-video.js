const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { uploadToR2 } = require("./r2");
const { VIDEO_ALEPH_MAX_SOURCE_BYTES } = require("./video-limits");

let ffmpegPath = null;
try {
  ffmpegPath = require("ffmpeg-static");
} catch {
  ffmpegPath = null;
}

const execFileAsync = promisify(execFile);

async function probeRemoteVideoBytes(videoUrl) {
  try {
    const head = await fetch(videoUrl, { method: "HEAD" });
    if (!head.ok) return null;
    const len = Number(head.headers.get("content-length"));
    return Number.isFinite(len) && len > 0 ? len : null;
  } catch {
    return null;
  }
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
          "8",
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
      "Vidéo trop lourde pour Runway Aleph (max 10 Mo). Filme en 720p ou coupe la vidéo.",
    ),
    { status: 422, code: "VIDEO_TOO_HEAVY_FOR_ALEPH", cause: lastErr },
  );
}

/**
 * Runway Aleph (KIE) refuse les sources > 10 Mo. On transcode côté serveur si besoin.
 */
async function resolveAlephSourceVideoUrl(videoUrl, userId) {
  const url = String(videoUrl || "").trim();
  if (!url.startsWith("http")) {
    throw Object.assign(new Error("URL vidéo invalide"), {
      status: 422,
      code: "VIDEO_URL_INVALID",
    });
  }

  const remoteBytes = await probeRemoteVideoBytes(url);
  if (
    remoteBytes != null &&
    remoteBytes <= VIDEO_ALEPH_MAX_SOURCE_BYTES
  ) {
    return url;
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
    if (buffer.length <= VIDEO_ALEPH_MAX_SOURCE_BYTES) {
      return url;
    }
    await fs.writeFile(inputPath, buffer);
    await transcodeForAleph(inputPath, outputPath);
    const outBuffer = await fs.readFile(outputPath);
    const key = `inputs/${userId}/${Date.now()}-aleph.mp4`;
    return uploadToR2(key, outBuffer, "video/mp4");
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { resolveAlephSourceVideoUrl, VIDEO_ALEPH_MAX_SOURCE_BYTES };
