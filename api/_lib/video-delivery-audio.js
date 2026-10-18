/**
 * Livraison vidéo — ambiance source naturelle + voix IA (ducking), sans SFX ajoutés.
 */
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

const AMBIENT_BASE_VOLUME = 0.2;
const AMBIENT_DUCK_SIDECHAIN =
  "sidechaincompress=threshold=0.012:ratio=5:attack=12:release=280:makeup=2.5";

/** Extraction ambiance (vent, mer, moteur) — pas de voix ni bruitages synthétiques. */
const SOURCE_AMBIENT_AF =
  "highpass=f=180,lowpass=f=9000,afftdn=nf=-32:nt=w,volume=0.22";

/** Intégration voix — DÉSACTIVÉ le 2026-10-18 : l'EQ + compresseur altérait le
 * timbre brut des voix du catalogue (ex: Kaaris parfait en preview, dénaturé
 * en vidéo finale). La voix est désormais préservée telle quelle. */
const GENERATED_VOICE_AF = "";

async function downloadToFile(url, filePath, timeoutMs = 45_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    return buffer.length;
  } finally {
    clearTimeout(timer);
  }
}

async function pathHasAudio(filePath) {
  if (!ffmpegPath) return false;
  try {
    await execFileAsync(ffmpegPath, ["-i", filePath, "-hide_banner"], {
      timeout: 15_000,
    });
    return false;
  } catch (err) {
    return /Audio:/i.test(String(err.stderr || err.message || ""));
  }
}

/**
 * Mix voix générée + ambiance nettoyée de la vidéo source (ducking sur la voix).
 */
async function mixSourceAmbientWithDucking({
  sourceVideoUrl,
  generatedVideoUrl,
  larpId,
}) {
  if (!ffmpegPath || !sourceVideoUrl || !generatedVideoUrl || !larpId) {
    return null;
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vid-deliver-"));
  const genPath = path.join(tmpDir, "generated.mp4");
  const srcPath = path.join(tmpDir, "source.mp4");
  const outPath = path.join(tmpDir, "output.mp4");

  try {
    await Promise.all([
      downloadToFile(generatedVideoUrl, genPath),
      downloadToFile(sourceVideoUrl, srcPath),
    ]);

    const [srcHasAudio, genHasAudio] = await Promise.all([
      pathHasAudio(srcPath),
      pathHasAudio(genPath),
    ]);

    if (!genHasAudio && !srcHasAudio) return null;

    if (!srcHasAudio) {
      return polishGeneratedVideoVoiceOnly({ generatedVideoUrl, larpId, genPath });
    }

    if (!genHasAudio) {
      const filterComplex = `[1:a]${SOURCE_AMBIENT_AF}[aout]`;
      await execFileAsync(
        ffmpegPath,
        [
          "-y",
          "-i",
          genPath,
          "-i",
          srcPath,
          "-filter_complex",
          filterComplex,
          "-map",
          "0:v:0",
          "-map",
          "[aout]",
          "-c:v",
          "copy",
          "-c:a",
          "aac",
          "-b:a",
          "192k",
          "-ar",
          "44100",
          "-shortest",
          "-movflags",
          "+faststart",
          outPath,
        ],
        { timeout: 120_000, maxBuffer: 14 * 1024 * 1024 },
      );
    } else {
      // Voix brute préservée (GENERATED_VOICE_AF désactivé) — mix direct avec l'ambiance duckée.
      const filterComplex = [
        `[1:a]${SOURCE_AMBIENT_AF}[ambraw]`,
        `[ambraw][0:a]${AMBIENT_DUCK_SIDECHAIN}[ambduck]`,
        `[0:a][ambduck]amix=inputs=2:duration=shortest:dropout_transition=0:weights=1 ${AMBIENT_BASE_VOLUME}[aout]`,
      ].join(";");
      await execFileAsync(
        ffmpegPath,
        [
          "-y",
          "-i",
          genPath,
          "-i",
          srcPath,
          "-filter_complex",
          filterComplex,
          "-map",
          "0:v:0",
          "-map",
          "[aout]",
          "-c:v",
          "copy",
          "-c:a",
          "aac",
          "-b:a",
          "192k",
          "-ar",
          "44100",
          "-shortest",
          "-movflags",
          "+faststart",
          outPath,
        ],
        { timeout: 120_000, maxBuffer: 14 * 1024 * 1024 },
      );
    }

    const outBuffer = await fs.readFile(outPath);
    if (outBuffer.length < 2048) return null;
    const { uploadToR2 } = require("./r2");
    return uploadToR2(`larps/${larpId}/video.mp4`, outBuffer, "video/mp4");
  } catch (err) {
    console.error("[video-delivery-audio] ducking mix failed", { larpId, err });
    return null;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function polishGeneratedVideoVoiceOnly({
  generatedVideoUrl,
  larpId,
  genPath: existingGenPath,
}) {
  if (!ffmpegPath || !larpId) return null;
  const tmpDir = existingGenPath
    ? null
    : await fs.mkdtemp(path.join(os.tmpdir(), "vid-vox-"));
  const genPath =
    existingGenPath || path.join(tmpDir, "generated.mp4");
  const outPath = path.join(existingGenPath ? path.dirname(existingGenPath) : tmpDir, "out.mp4");

  try {
    if (!existingGenPath) {
      await downloadToFile(generatedVideoUrl, genPath);
    }
    const hasAudio = await pathHasAudio(genPath);
    if (!hasAudio) return null;

    const ffmpegArgs = [
      "-y",
      "-i",
      genPath,
      // Pas de -af : la voix est préservée brute (GENERATED_VOICE_AF désactivé).
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-ar",
      "44100",
      "-movflags",
      "+faststart",
      outPath,
    ];
    await execFileAsync(ffmpegPath, ffmpegArgs, {
      timeout: 90_000,
      maxBuffer: 12 * 1024 * 1024,
    });

    const outBuffer = await fs.readFile(outPath);
    if (outBuffer.length < 2048) return null;
    const { uploadToR2 } = require("./r2");
    return uploadToR2(`larps/${larpId}/video.mp4`, outBuffer, "video/mp4");
  } catch (err) {
    console.warn("[video-delivery-audio] voice polish failed", { larpId, err });
    return null;
  } finally {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

function shouldApplyVideoDeliveryAudioMix(meta) {
  if (!meta || typeof meta !== "object") return false;
  if (meta.voice_enabled === true || meta.lip_sync_enabled === true) return true;
  if (meta.preserve_source_audio === true) return true;
  return false;
}

/**
 * Post-traitement audio livraison (toutes vidéos éligibles).
 */
async function finalizeVideoDeliveryAudio({
  meta,
  generatedVideoUrl,
  sourceVideoUrl,
  larpId,
}) {
  if (!shouldApplyVideoDeliveryAudioMix(meta) || !generatedVideoUrl || !larpId) {
    return null;
  }

  if (sourceVideoUrl) {
    const mixed = await mixSourceAmbientWithDucking({
      sourceVideoUrl,
      generatedVideoUrl,
      larpId,
    });
    if (mixed) return { url: mixed, mode: "ambient_duck_mix" };
  }

  const polished = await polishGeneratedVideoVoiceOnly({
    generatedVideoUrl,
    larpId,
  });
  if (polished) return { url: polished, mode: "voice_polish_only" };
  return null;
}

module.exports = {
  AMBIENT_BASE_VOLUME,
  SOURCE_AMBIENT_AF,
  GENERATED_VOICE_AF,
  shouldApplyVideoDeliveryAudioMix,
  mixSourceAmbientWithDucking,
  polishGeneratedVideoVoiceOnly,
  finalizeVideoDeliveryAudio,
};
