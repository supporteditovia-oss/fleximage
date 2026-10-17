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
 * Post-traitement sortie Fish (clone) — chaleur bas-médiums, atténuation métallique, compresse douce.
 */
const VOICE_CLONE_WARMTH_AF =
  "equalizer=f=200:width_type=o:width=2:g=2.4," +
  "equalizer=f=2800:width_type=o:width=2:g=-1.6," +
  "equalizer=f=4200:width_type=o:width=2:g=-2.2," +
  "equalizer=f=5200:width_type=o:width=2:g=-1.4," +
  "acompressor=threshold=-20dB:ratio=2.2:attack=12:release=140:makeup=1.2";

async function applyVoiceCloneWarmthPostprocess(inputBuffer) {
  if (!inputBuffer?.length) {
    throw Object.assign(new Error("Audio vide"), {
      status: 400,
      code: "empty_audio",
    });
  }

  if (!ffmpegPath) {
    return inputBuffer;
  }

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
        VOICE_CLONE_WARMTH_AF,
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
  applyVoiceCloneWarmthPostprocess,
};
