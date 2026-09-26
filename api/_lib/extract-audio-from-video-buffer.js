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

const MAX_VOICE_VIDEO_BYTES = 25 * 1024 * 1024;

/**
 * Extrait un WAV mono 44,1 kHz (max ~25 s) pour Fish — repli si le client n’a pas pu décoder.
 */
async function extractVoiceSampleWavFromVideoBuffer(
  videoBuffer,
  { startSec = 0, durationSec = 25 } = {},
) {
  if (!ffmpegPath) {
    throw Object.assign(new Error("Extraction audio indisponible"), {
      status: 503,
      code: "FFMPEG_UNAVAILABLE",
    });
  }
  if (!videoBuffer?.length || videoBuffer.length > MAX_VOICE_VIDEO_BYTES) {
    throw Object.assign(new Error("Vidéo échantillon trop lourde (max 25 Mo)"), {
      status: 422,
      code: "VIDEO_SAMPLE_TOO_LARGE",
    });
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "voice-vid-"));
  const inputPath = path.join(tmpDir, "in.bin");
  const outputPath = path.join(tmpDir, "out.wav");

  try {
    await fs.writeFile(inputPath, videoBuffer);
    await execFileAsync(
      ffmpegPath,
      [
        "-y",
        "-ss",
        String(Math.max(0, startSec)),
        "-i",
        inputPath,
        "-t",
        String(Math.min(25, Math.max(0.5, durationSec))),
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "44100",
        "-ac",
        "1",
        outputPath,
      ],
      { timeout: 120_000 },
    );
    const wav = await fs.readFile(outputPath);
    if (!wav.length) {
      throw Object.assign(new Error("Aucun audio dans cette vidéo"), {
        status: 422,
        code: "VIDEO_NO_AUDIO",
      });
    }
    return wav;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = {
  extractVoiceSampleWavFromVideoBuffer,
  MAX_VOICE_VIDEO_BYTES,
};
