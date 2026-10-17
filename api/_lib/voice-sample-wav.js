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
const SAMPLE_RATE = 44100;
const MAX_VOICE_SAMPLE_DURATION_SEC = 90;

function isCanonicalMonoWav(buffer) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 44 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    return false;
  }

  let offset = 12;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataSize = 0;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (chunkStart + chunkSize > buffer.length) return false;

    if (chunkId === "fmt " && chunkSize >= 16) {
      channels = buffer.readUInt16LE(chunkStart + 2);
      sampleRate = buffer.readUInt32LE(chunkStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
    } else if (chunkId === "data") {
      dataSize = chunkSize;
      break;
    }

    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (channels !== 1 || sampleRate !== SAMPLE_RATE || bitsPerSample !== 16) {
    return false;
  }

  const durationSec = dataSize / (SAMPLE_RATE * 2);
  return dataSize > 0 && durationSec <= MAX_VOICE_SAMPLE_DURATION_SEC;
}

function getCanonicalWavDurationSec(buffer) {
  if (!isCanonicalMonoWav(buffer)) {
    throw Object.assign(new Error("Échantillon WAV mono invalide."), {
      status: 422,
      code: "invalid_voice_audio",
    });
  }

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkId === "data") return chunkSize / (SAMPLE_RATE * 2);
    offset += 8 + chunkSize + (chunkSize % 2);
  }

  throw Object.assign(new Error("Durée de l’échantillon WAV introuvable."), {
    status: 422,
    code: "invalid_voice_audio",
  });
}

function audioInputExtension(contentType) {
  const type = String(contentType || "").toLowerCase();
  if (type.includes("wav") || type.includes("wave")) return ".wav";
  if (type.includes("webm")) return ".webm";
  if (type.includes("ogg") || type.includes("opus")) return ".ogg";
  if (type.includes("mp4") || type.includes("m4a")) return ".m4a";
  if (type.includes("mpeg") || type.includes("mp3")) return ".mp3";
  return ".bin";
}

async function convertVoiceSampleToWav(buffer, contentType = "") {
  if (!Buffer.isBuffer(buffer) || buffer.length < 256) {
    throw Object.assign(new Error("Échantillon audio vide ou invalide."), {
      status: 422,
      code: "invalid_voice_audio",
    });
  }
  if (!ffmpegPath) {
    throw Object.assign(new Error("Conversion audio indisponible."), {
      status: 503,
      code: "voice_audio_conversion_unavailable",
    });
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "voice-sample-"));
  const inputPath = path.join(tmpDir, `input${audioInputExtension(contentType)}`);
  const outputPath = path.join(tmpDir, "output.wav");

  try {
    await fs.writeFile(inputPath, buffer);
    await execFileAsync(
      ffmpegPath,
      [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        inputPath,
        "-t",
        String(MAX_VOICE_SAMPLE_DURATION_SEC + 0.1),
        "-vn",
        "-ac",
        "1",
        "-ar",
        String(SAMPLE_RATE),
        "-c:a",
        "pcm_s16le",
        "-f",
        "wav",
        outputPath,
      ],
      { timeout: 120_000, maxBuffer: 8 * 1024 * 1024 },
    );

    const wav = await fs.readFile(outputPath);
    if (!isCanonicalMonoWav(wav)) {
      throw new Error("FFmpeg produced an invalid WAV sample");
    }
    return wav;
  } catch (err) {
    if (err?.status === 422 && err?.code === "invalid_voice_audio") throw err;
    throw Object.assign(
      new Error(
        "Échantillon audio illisible ou trop long. Réessaie avec un fichier audio valide de 90 secondes maximum.",
      ),
      { status: 422, code: "invalid_voice_audio", cause: err },
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = {
  convertVoiceSampleToWav,
  getCanonicalWavDurationSec,
  isCanonicalMonoWav,
};
