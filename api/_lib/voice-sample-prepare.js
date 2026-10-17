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
const VOICE_CLONE_AF =
  "silenceremove=start_periods=1:start_silence=0.25:start_threshold=-42dB," +
  "areverse,silenceremove=start_periods=1:start_silence=0.25:start_threshold=-42dB,areverse," +
  "highpass=f=80,lowpass=f=12000," +
  "afftdn=nf=-22:nt=w," +
  "acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=2," +
  "loudnorm=I=-18:TP=-2:LRA=9:print_format=none";

/**
 * Prépare un échantillon clone (WAV ou autre audio) avant Fish / ASR.
 * @param {Buffer} inputBuffer
 * @returns {Promise<Buffer>}
 */
async function prepareVoiceCloneSampleBuffer(inputBuffer) {
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
        VOICE_CLONE_AF,
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
  return prepareVoiceCloneSampleBuffer(inputBuffer);
}

module.exports = {
  prepareVoiceCloneSampleBuffer,
  normalizeVoiceRecordSampleBuffer,
  prepareVoiceSampleForCloneSource,
  VOICE_CLONE_AF,
};
