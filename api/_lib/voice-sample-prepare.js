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

/**
 * Chaîne FFmpeg pour interviews / extraits bruts :
 * - coupe silence extrême, HP/LP, réduction bruit légère, loudness cible, mono 44.1 kHz.
 */
/** Mode C — interviews bruitées : nettoyage plus poussé (modèle Fish / archive). */
const VOICE_CLONE_AF =
  "silenceremove=start_periods=1:start_silence=0.25:start_threshold=-42dB," +
  "areverse,silenceremove=start_periods=1:start_silence=0.25:start_threshold=-42dB,areverse," +
  "highpass=f=60,lowpass=f=12000," +
  "afftdn=nf=-24:nt=w," +
  "acompressor=threshold=-22dB:ratio=2.5:attack=8:release=120:makeup=2.5," +
  "loudnorm=I=-16:TP=-1.5:LRA=10:print_format=none";

/**
 * Inline Fish (zero-shot) — préserve nasalité / timbre (Jul…) : pas de denoise ni compresseur agressif.
 */
const VOICE_CLONE_INLINE_AF =
  "highpass=f=60,lowpass=f=14000," +
  "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=none";

/**
 * Prépare un échantillon clone (WAV ou autre audio) avant Fish / ASR.
 * @param {Buffer} inputBuffer
 * @returns {Promise<Buffer>}
 */
async function runFfmpegVoiceFilter(inputBuffer, audioFilter) {
  if (!inputBuffer?.length) {
    throw Object.assign(new Error("Échantillon audio vide"), {
      status: 400,
      code: "empty_audio",
    });
  }

  if (!ffmpegPath) {
    return inputBuffer;
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "voice-prep-"));
  const inputPath = path.join(tmpDir, "in.wav");
  const outputPath = path.join(tmpDir, "out.wav");

  try {
    await fs.writeFile(inputPath, inputBuffer);
    await execFileAsync(
      ffmpegPath,
      [
        "-y",
        "-i",
        inputPath,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "44100",
        "-acodec",
        "pcm_s16le",
        "-af",
        audioFilter,
        outputPath,
      ],
      { timeout: 90_000 },
    );
    const out = await fs.readFile(outputPath);
    if (!out.length) return inputBuffer;
    return out;
  } catch (err) {
    console.warn("voice-sample-prepare fallback (ffmpeg)", err?.message || err);
    return inputBuffer;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function prepareVoiceCloneInlineReferenceBuffer(inputBuffer) {
  return runFfmpegVoiceFilter(inputBuffer, VOICE_CLONE_INLINE_AF);
}

async function prepareVoiceCloneSampleBuffer(inputBuffer) {
  if (!inputBuffer?.length) {
    throw Object.assign(new Error("Échantillon audio vide"), {
      status: 400,
      code: "empty_audio",
    });
  }

  return runFfmpegVoiceFilter(inputBuffer, VOICE_CLONE_AF);
}

/**
 * Cas B — enregistrement micro : format mono 44.1 kHz sans filtrage destructif.
 */
async function normalizeVoiceRecordSampleBuffer(inputBuffer) {
  if (!inputBuffer?.length) {
    throw Object.assign(new Error("Échantillon audio vide"), {
      status: 400,
      code: "empty_audio",
    });
  }

  if (!ffmpegPath) {
    return inputBuffer;
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "voice-norm-"));
  const inputPath = path.join(tmpDir, "in.wav");
  const outputPath = path.join(tmpDir, "out.wav");

  try {
    await fs.writeFile(inputPath, inputBuffer);
    await execFileAsync(
      ffmpegPath,
      [
        "-y",
        "-i",
        inputPath,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "44100",
        "-acodec",
        "pcm_s16le",
        outputPath,
      ],
      { timeout: 60_000 },
    );
    const out = await fs.readFile(outputPath);
    if (!out.length) return inputBuffer;
    return out;
  } catch (err) {
    console.warn("voice-sample-normalize fallback", err?.message || err);
    return inputBuffer;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Prépare l’échantillon selon la source (B enregistrement vs C import externe).
 */
async function prepareVoiceSampleForCloneSource(inputBuffer, sourceType = "import") {
  if (sourceType === "record") {
    return normalizeVoiceRecordSampleBuffer(inputBuffer);
  }
  if (sourceType === "catalog") {
    return inputBuffer;
  }
  return prepareVoiceCloneInlineReferenceBuffer(inputBuffer);
}

module.exports = {
  prepareVoiceCloneSampleBuffer,
  prepareVoiceCloneInlineReferenceBuffer,
  normalizeVoiceRecordSampleBuffer,
  prepareVoiceSampleForCloneSource,
  VOICE_CLONE_AF,
  VOICE_CLONE_INLINE_AF,
};
