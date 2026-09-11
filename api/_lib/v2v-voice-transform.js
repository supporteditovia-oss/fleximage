const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { transcribeAudio, synthesizeSpeech } = require("./fish-audio");
const {
  pickVoiceReferenceId,
  resolveTargetGender,
} = require("./v2v-voice-pool");

let ffmpegPath = null;
try {
  ffmpegPath = require("ffmpeg-static");
} catch {
  ffmpegPath = null;
}

const execFileAsync = promisify(execFile);

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

async function extractAudioWav(sourceVideoPath, outWavPath) {
  if (!ffmpegPath) return false;
  await execFileAsync(
    ffmpegPath,
    [
      "-y",
      "-i",
      sourceVideoPath,
      "-vn",
      "-acodec",
      "pcm_s16le",
      "-ar",
      "16000",
      "-ac",
      "1",
      outWavPath,
    ],
    { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 },
  );
  const stat = await fs.stat(outWavPath).catch(() => null);
  return Boolean(stat && stat.size > 1024);
}

async function muxAudioOntoVideo(videoPath, audioPath, outPath) {
  if (!ffmpegPath) return false;
  await execFileAsync(
    ffmpegPath,
    [
      "-y",
      "-i",
      videoPath,
      "-i",
      audioPath,
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
  const stat = await fs.stat(outPath).catch(() => null);
  return Boolean(stat && stat.size > 2048);
}

function isFishConfigured() {
  try {
    require("./fish-audio").getFishConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Transcrit la voix filmée, resynthétise avec une voix IA (homme/femme/auto) et mux sur la vidéo générée.
 * @returns {Promise<{ url: string, gender: string, fishReferenceId: string, transcript: string } | null>}
 */
async function transformV2vVoiceAndMux({
  sourceVideoUrl,
  generatedVideoUrl,
  larpId,
  voiceMode,
  swapPrompt,
}) {
  if (!ffmpegPath) {
    console.warn("[v2v-voice-transform] ffmpeg-static indisponible");
    return null;
  }
  if (!isFishConfigured()) {
    console.warn("[v2v-voice-transform] Fish Audio non configuré");
    return null;
  }
  if (!sourceVideoUrl || !generatedVideoUrl || !larpId) return null;

  const gender = resolveTargetGender(voiceMode, swapPrompt, larpId);
  if (!gender) return null;

  const fishReferenceId = pickVoiceReferenceId(gender, larpId);
  if (!fishReferenceId) {
    console.warn("[v2v-voice-transform] pool vocal vide", { gender, larpId });
    return null;
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "v2v-voice-"));
  const genPath = path.join(tmpDir, "generated.mp4");
  const srcPath = path.join(tmpDir, "source.mp4");
  const wavPath = path.join(tmpDir, "source.wav");
  const mp3Path = path.join(tmpDir, "voice.mp3");
  const outPath = path.join(tmpDir, "output.mp4");

  try {
    await Promise.all([
      downloadToFile(generatedVideoUrl, genPath),
      downloadToFile(sourceVideoUrl, srcPath),
    ]);

    const hasAudio = await sourceHasAudioStream(srcPath);
    if (!hasAudio) {
      console.info("[v2v-voice-transform] no audio in source", { larpId });
      return null;
    }

    const extracted = await extractAudioWav(srcPath, wavPath);
    if (!extracted) return null;

    const wavBuffer = await fs.readFile(wavPath);
    const transcript = await transcribeAudio(wavBuffer, "fr");
    const mp3Buffer = await synthesizeSpeech({
      text: transcript,
      referenceId: fishReferenceId,
      format: "mp3",
    });
    await fs.writeFile(mp3Path, mp3Buffer);

    const muxed = await muxAudioOntoVideo(genPath, mp3Path, outPath);
    if (!muxed) return null;

    const outBuffer = await fs.readFile(outPath);
    const { uploadToR2 } = require("./r2");
    const key = `larps/${larpId}/video.mp4`;
    const url = await uploadToR2(key, outBuffer, "video/mp4");
    if (!url) return null;

    return {
      url,
      gender,
      fishReferenceId,
      transcript: transcript.slice(0, 500),
    };
  } catch (err) {
    console.error("[v2v-voice-transform] failed", { larpId, err });
    return null;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Synthèse MP3 → mux sur vidéo générée (I2V voix adaptée). */
async function muxSpeechMp3OntoVideo({
  generatedVideoUrl,
  larpId,
  mp3Buffer,
}) {
  if (!ffmpegPath || !generatedVideoUrl || !larpId || !mp3Buffer?.length) {
    return null;
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "i2v-voice-"));
  const genPath = path.join(tmpDir, "generated.mp4");
  const mp3Path = path.join(tmpDir, "voice.mp3");
  const outPath = path.join(tmpDir, "output.mp4");

  try {
    await downloadToFile(generatedVideoUrl, genPath);
    await fs.writeFile(mp3Path, mp3Buffer);
    const muxed = await muxAudioOntoVideo(genPath, mp3Path, outPath);
    if (!muxed) return null;

    const outBuffer = await fs.readFile(outPath);
    const { uploadToR2 } = require("./r2");
    const key = `larps/${larpId}/video.mp4`;
    return await uploadToR2(key, outBuffer, "video/mp4");
  } catch (err) {
    console.error("[muxSpeechMp3OntoVideo] failed", { larpId, err });
    return null;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = {
  transformV2vVoiceAndMux,
  muxSpeechMp3OntoVideo,
  isFishConfigured,
  extractAudioWav,
  muxAudioOntoVideo,
  sourceHasAudioStream,
};
