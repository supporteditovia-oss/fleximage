const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");

let ffmpegPath = null;
try {
  ffmpegPath = require("ffmpeg-static");
} catch {
  ffmpegPath = null;
}

const execFileAsync = promisify(execFile);

function isLikelyVideoAssetUrl(url) {
  const text = String(url || "").toLowerCase();
  if (!text.startsWith("http")) return false;
  return (
    /\.(mp4|mov|webm|m4v)(\?|#|$)/.test(text) ||
    /\/inputs\/[^/]+\/\d+-source\./.test(text)
  );
}

function getSourceVideoUrlFromLarp(larp) {
  const meta =
    larp && larp.metadata && typeof larp.metadata === "object"
      ? larp.metadata
      : {};
  if (typeof meta.source_video_url === "string" && meta.source_video_url) {
    return meta.source_video_url;
  }
  if (meta.workflow !== "video_to_video") return null;

  const assets = Array.isArray(larp.input_assets) ? larp.input_assets : [];
  const videoAssets = assets.filter(isLikelyVideoAssetUrl);
  if (videoAssets.length === 0) return null;
  return videoAssets[videoAssets.length - 1];
}

async function downloadToFile(url, filePath, timeoutMs = 45_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    return buffer.length;
  } finally {
    clearTimeout(timer);
  }
}

async function sourceHasAudioStream(sourcePath) {
  if (!ffmpegPath) return false;
  try {
    const { stdout } = await execFileAsync(
      ffmpegPath,
      ["-i", sourcePath, "-hide_banner"],
      { timeout: 15_000 },
    );
    return /Audio:/i.test(String(stdout));
  } catch (err) {
    const stderr = String(err.stderr || err.message || "");
    return /Audio:/i.test(stderr);
  }
}

/**
 * Colle la piste audio de la vidéo source (ta voix) sur la vidéo générée.
 * Retourne l'URL R2 muxée ou null si échec / pas d'audio source.
 */
async function muxSourceAudioOntoVideo({
  sourceVideoUrl,
  generatedVideoUrl,
  larpId,
}) {
  if (!ffmpegPath) {
    console.warn("[mux-source-audio] ffmpeg-static indisponible");
    return null;
  }
  if (!sourceVideoUrl || !generatedVideoUrl || !larpId) return null;

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "v2v-audio-"));
  const genPath = path.join(tmpDir, "generated.mp4");
  const srcPath = path.join(tmpDir, "source.mp4");
  const outPath = path.join(tmpDir, "output.mp4");

  try {
    await Promise.all([
      downloadToFile(generatedVideoUrl, genPath),
      downloadToFile(sourceVideoUrl, srcPath),
    ]);

    const hasAudio = await sourceHasAudioStream(srcPath);
    if (!hasAudio) {
      console.info("[mux-source-audio] no audio track in source video", { larpId });
      return null;
    }

    await execFileAsync(
      ffmpegPath,
      [
        "-y",
        "-i",
        genPath,
        "-i",
        srcPath,
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        "-movflags",
        "+faststart",
        outPath,
      ],
      { timeout: 90_000, maxBuffer: 10 * 1024 * 1024 },
    );

    const outBuffer = await fs.readFile(outPath);
    if (outBuffer.length < 2048) return null;

    const { uploadToR2 } = require("./r2");
    const key = `larps/${larpId}/video.mp4`;
    return await uploadToR2(key, outBuffer, "video/mp4");
  } catch (err) {
    console.error("[mux-source-audio] mux failed", { larpId, err });
    return null;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = {
  getSourceVideoUrlFromLarp,
  isLikelyVideoAssetUrl,
  muxSourceAudioOntoVideo,
};
