/**
 * Grille I2V : 3|5 s × 720|1080p — trim + scale FFmpeg sur la livraison client.
 */
const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const {
  normalizeI2VDurationSec,
  normalizeI2VQuality,
} = require("../../shared/video-i2v-pricing.cjs");

let ffmpegPath = null;
try {
  ffmpegPath = require("ffmpeg-static");
} catch {
  ffmpegPath = null;
}

const execFileAsync = promisify(execFile);

const I2V_OUTPUT_HEIGHTS = Object.freeze([720, 1080]);

function i2vOutputHeightForQuality(quality) {
  return normalizeI2VQuality(quality) === "high" ? 1080 : 720;
}

/**
 * @returns {{ durationSec: 3|5, height: 720|1080, quality: 'standard'|'high' }}
 */
function resolveI2VOutputSpecFromMeta(meta) {
  const durationSec = normalizeI2VDurationSec(meta?.duration_sec ?? 5);
  const quality = normalizeI2VQuality(meta?.quality);
  const height = i2vOutputHeightForQuality(quality);
  return { durationSec, height, quality };
}

function isValidI2VOutputSpec(spec) {
  if (!spec || typeof spec !== "object") return false;
  const durationSec = Number(spec.durationSec);
  const height = Number(spec.height);
  return (
    (durationSec === 3 || durationSec === 5) &&
    (height === 720 || height === 1080)
  );
}

function shouldEnforceI2VOutputSpec(meta) {
  return meta && meta.workflow === "image_to_video";
}

/**
 * @param {Buffer} mp4Buffer
 * @param {{ durationSec: 3|5, height: 720|1080 }} spec
 * @returns {Promise<{ buffer: Buffer, enforced: boolean, reason?: string }>}
 */
async function enforceI2VOutputOnMp4Buffer(mp4Buffer, spec) {
  if (!mp4Buffer || mp4Buffer.length < 2048) {
    return { buffer: mp4Buffer, enforced: false, reason: "empty_input" };
  }
  if (!isValidI2VOutputSpec(spec)) {
    return { buffer: mp4Buffer, enforced: false, reason: "invalid_spec" };
  }
  if (!ffmpegPath) {
    console.warn("[i2v-output-enforce] ffmpeg-static indisponible");
    return { buffer: mp4Buffer, enforced: false, reason: "no_ffmpeg" };
  }

  const durationSec = spec.durationSec;
  const height = spec.height;
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "i2v-spec-"));
  const inPath = path.join(tmpDir, "in.mp4");
  const outPath = path.join(tmpDir, "out.mp4");

  try {
    await fs.writeFile(inPath, mp4Buffer);
    const vf = `scale=-2:${height}`;
    await execFileAsync(
      ffmpegPath,
      [
        "-y",
        "-i",
        inPath,
        "-t",
        String(durationSec),
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "22",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-movflags",
        "+faststart",
        outPath,
      ],
      { timeout: 120_000, maxBuffer: 12 * 1024 * 1024 },
    );
    const outBuffer = await fs.readFile(outPath);
    if (outBuffer.length < 2048) {
      return { buffer: mp4Buffer, enforced: false, reason: "encode_too_small" };
    }
    return { buffer: outBuffer, enforced: true };
  } catch (err) {
    console.warn("[i2v-output-enforce] ffmpeg failed", {
      err: err?.message || err,
      durationSec,
      height,
    });
    return { buffer: mp4Buffer, enforced: false, reason: "ffmpeg_error" };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = {
  I2V_OUTPUT_HEIGHTS,
  i2vOutputHeightForQuality,
  resolveI2VOutputSpecFromMeta,
  isValidI2VOutputSpec,
  shouldEnforceI2VOutputSpec,
  enforceI2VOutputOnMp4Buffer,
};
