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
 * Post-traitement sortie Fish — modes B/C uniquement (pas le catalogue studio Mode A).
 * Chaleur bas-médiums, atténuation métallique, compresse douce.
 */
const VOICE_CLONE_WARMTH_AF =
  "equalizer=f=200:width_type=o:width=2:g=2.4," +
  "equalizer=f=2800:width_type=o:width=2:g=-1.6," +
  "equalizer=f=4200:width_type=o:width=2:g=-2.2," +
  "equalizer=f=5200:width_type=o:width=2:g=-1.4," +
  "acompressor=threshold=-20dB:ratio=2.2:attack=12:release=140:makeup=1.2";

/** Mode C voix graves — restauration 85–200 Hz (Kaaris, Jul…) + grain rauque. */
const VOICE_CLONE_WARMTH_DEEP_AF =
  "equalizer=f=85:width_type=o:width=1.5:g=2.4," +
  "equalizer=f=120:width_type=o:width=2:g=3.8," +
  "equalizer=f=150:width_type=o:width=2:g=5.0," +
  "equalizer=f=200:width_type=o:width=2:g=4.2," +
  "equalizer=f=950:width_type=o:width=2:g=1.1," +
  "equalizer=f=3000:width_type=o:width=2:g=-0.8," +
  "equalizer=f=4500:width_type=o:width=2:g=-1.4," +
  "acompressor=threshold=-26dB:ratio=1.45:attack=22:release=200:makeup=0.95";

/** Mode C identité (Jul…) — correction légère sans aplatir le timbre. */
const VOICE_CLONE_WARMTH_IDENTITY_AF =
  "equalizer=f=2800:width_type=o:width=2:g=-1.4," +
  "equalizer=f=4800:width_type=o:width=2:g=-1.6," +
  "acompressor=threshold=-24dB:ratio=1.6:attack=18:release=170:makeup=0.8";

async function applyVoiceCloneWarmthPostprocess(inputBuffer, options = {}) {
  if (!inputBuffer?.length) {
    throw Object.assign(new Error("Audio vide"), {
      status: 400,
      code: "empty_audio",
    });
  }

  if (options.incisive === true) {
    return inputBuffer;
  }

  if (!ffmpegPath) {
    return inputBuffer;
  }

  const filter =
    options.deepChest === true
      ? VOICE_CLONE_WARMTH_DEEP_AF
      : options.identityInline === true
        ? VOICE_CLONE_WARMTH_IDENTITY_AF
        : VOICE_CLONE_WARMTH_AF;

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "voice-warmth-"));
  const inputPath = path.join(tmpDir, "in.mp3");
  const outputPath = path.join(tmpDir, "out.mp3");

  try {
    await fs.writeFile(inputPath, inputBuffer);
    await execFileAsync(
      ffmpegPath,
      [
        "-y",
        "-i",
        inputPath,
        "-vn",
        "-acodec",
        "libmp3lame",
        "-b:a",
        "256k",
        "-af",
        filter,
        outputPath,
      ],
      { timeout: 90_000 },
    );
    const out = await fs.readFile(outputPath);
    if (!out.length) return inputBuffer;
    return out;
  } catch (err) {
    console.warn("voice-clone-warmth fallback", err?.message || err);
    return inputBuffer;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = {
  VOICE_CLONE_WARMTH_AF,
  VOICE_CLONE_WARMTH_DEEP_AF,
  VOICE_CLONE_WARMTH_IDENTITY_AF,
  applyVoiceCloneWarmthPostprocess,
};
