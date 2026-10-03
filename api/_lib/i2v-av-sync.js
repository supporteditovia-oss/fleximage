/**
 * Image→Vidéo (Avatar Pro) : durées audio/vidéo, pad/trim, QA.
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

const DEFAULT_MAX_AV_GAP_SEC = 0.3;

/** Fish TTS plus long que duration_sec — on refuse (pas de trim ni atempo). */
class I2VVoiceDurationExceedsTargetError extends Error {
  /**
   * @param {{ audioSec: number, targetSec: number }} details
   */
  constructor(details) {
    const audioSec = Number(details?.audioSec);
    const targetSec = Number(details?.targetSec);
    super(
      `i2v_voice_exceeds_duration:${Number.isFinite(audioSec) ? audioSec.toFixed(2) : "?"}s>${Number.isFinite(targetSec) ? targetSec : "?"}s`,
    );
    this.name = "I2VVoiceDurationExceedsTargetError";
    this.code = "I2V_VOICE_TOO_LONG";
    this.audioSec = audioSec;
    this.targetSec = targetSec;
  }
}

function getMaxAvGapSec() {
  const n = Number(process.env.I2V_AV_MAX_GAP_SEC);
  return Number.isFinite(n) && n > 0 && n < 2 ? n : DEFAULT_MAX_AV_GAP_SEC;
}

function parseTimecodeToSec(h, m, s) {
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function parseDurationFromFfmpegBanner(text) {
  const m = String(text || "").match(
    /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/,
  );
  if (!m) return null;
  return parseTimecodeToSec(m[1], m[2], m[3]);
}

function parseLastDecodedTimeSec(text) {
  const matches = String(text || "").match(
    /time=(\d+):(\d+):(\d+(?:\.\d+)?)/g,
  );
  if (!matches || matches.length === 0) return null;
  const last = matches[matches.length - 1];
  const m = last.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) return null;
  return parseTimecodeToSec(m[1], m[2], m[3]);
}

async function ffmpegBanner(filePath) {
  if (!ffmpegPath) return "";
  try {
    await execFileAsync(ffmpegPath, ["-hide_banner", "-i", filePath], {
      timeout: 45_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    return "";
  } catch (err) {
    return String(err.stderr || err.message || "");
  }
}

/**
 * @returns {Promise<{ formatSec: number|null, videoSec: number|null, audioSec: number|null }>}
 */
async function probeMediaDurations(filePath) {
  if (!ffmpegPath) {
    return { formatSec: null, videoSec: null, audioSec: null };
  }
  const banner = await ffmpegBanner(filePath);
  const formatSec = parseDurationFromFfmpegBanner(banner);

  async function decodeStreamDuration(map) {
    try {
      await execFileAsync(
        ffmpegPath,
        ["-hide_banner", "-i", filePath, "-map", map, "-f", "null", "-"],
        { timeout: 90_000, maxBuffer: 8 * 1024 * 1024 },
      );
      return null;
    } catch (err) {
      return parseLastDecodedTimeSec(err.stderr || "");
    }
  }

  const hasVideo = /Video:/i.test(banner);
  const hasAudio = /Audio:/i.test(banner);
  const [videoSec, audioSec] = await Promise.all([
    hasVideo ? decodeStreamDuration("0:v:0") : Promise.resolve(null),
    hasAudio ? decodeStreamDuration("0:a:0") : Promise.resolve(null),
  ]);

  return {
    formatSec,
    videoSec: videoSec ?? formatSec,
    audioSec: audioSec ?? (hasAudio ? null : 0),
  };
}

function effectiveAvGapSec(durations) {
  const videoSec = Number(durations.videoSec ?? durations.formatSec);
  const audioSec = Number(durations.audioSec);
  if (!Number.isFinite(videoSec) || videoSec <= 0) return null;
  if (!Number.isFinite(audioSec) || audioSec < 0) return null;
  return Math.abs(videoSec - audioSec);
}

async function runFfmpeg(args, timeoutMs = 90_000) {
  if (!ffmpegPath) throw new Error("ffmpeg_unavailable");
  await execFileAsync(ffmpegPath, args, {
    timeout: timeoutMs,
    maxBuffer: 10 * 1024 * 1024,
  });
}

/**
 * Caler la piste voix sur duration_sec : silence en fin si trop court ;
 * si Fish dépasse la cible → erreur (jamais de coupe ni accélération).
 * @returns {Promise<Buffer>}
 */
async function fitAudioBufferToDurationSec(mp3Buffer, targetSec) {
  const target = Math.max(0.5, Number(targetSec) || 5);
  if (!ffmpegPath || !Buffer.isBuffer(mp3Buffer) || mp3Buffer.length < 64) {
    return mp3Buffer;
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "i2v-audio-fit-"));
  const inPath = path.join(tmpDir, "in.mp3");
  const outPath = path.join(tmpDir, "out.mp3");
  try {
    await fs.writeFile(inPath, mp3Buffer);
    const before = await probeMediaDurations(inPath);
    const current = Number(before.audioSec ?? before.formatSec);
    if (Number.isFinite(current) && Math.abs(current - target) <= 0.05) {
      return mp3Buffer;
    }

    if (Number.isFinite(current) && current > target + 0.05) {
      throw new I2VVoiceDurationExceedsTargetError({
        audioSec: current,
        targetSec: target,
      });
    } else {
      const padSec = Number.isFinite(current)
        ? Math.max(0, target - current)
        : target;
      await runFfmpeg([
        "-y",
        "-i",
        inPath,
        "-af",
        `apad=pad_dur=${padSec.toFixed(3)}`,
        "-t",
        String(target),
        "-c:a",
        "libmp3lame",
        "-b:a",
        "192k",
        outPath,
      ]);
    }

    const out = await fs.readFile(outPath);
    return out.length >= 64 ? out : mp3Buffer;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Silent stereo MP3 for Avatar when voice addon is off. */
async function buildSilentMp3Buffer(durationSec) {
  const target = Math.max(0.5, Number(durationSec) || 5);
  if (!ffmpegPath) {
    throw new Error("ffmpeg_unavailable");
  }
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "i2v-silent-"));
  const outPath = path.join(tmpDir, "silent.mp3");
  try {
    await runFfmpeg([
      "-y",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=44100:cl=mono",
      "-t",
      String(target),
      "-c:a",
      "libmp3lame",
      "-b:a",
      "192k",
      outPath,
    ]);
    return fs.readFile(outPath);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Align embedded A/V in an MP4 (pad audio or trim video to the shorter stream).
 * @returns {Promise<{ buffer: Buffer, durationsBefore, durationsAfter, gapBefore, gapAfter, method: string|null }>}
 */
async function alignVideoAudioInMp4Buffer(mp4Buffer) {
  if (!ffmpegPath || !Buffer.isBuffer(mp4Buffer) || mp4Buffer.length < 2048) {
    return {
      buffer: mp4Buffer,
      skipped: true,
      reason: "ffmpeg_or_buffer",
      gapBefore: null,
      gapAfter: null,
    };
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "i2v-av-align-"));
  const inPath = path.join(tmpDir, "in.mp4");
  const outPath = path.join(tmpDir, "out.mp4");
  try {
    await fs.writeFile(inPath, mp4Buffer);
    const before = await probeMediaDurations(inPath);
    const gapBefore = effectiveAvGapSec(before);
    const videoSec = Number(before.videoSec ?? before.formatSec);
    const audioSec = Number(before.audioSec);

    if (
      gapBefore == null ||
      !Number.isFinite(videoSec) ||
      !Number.isFinite(audioSec)
    ) {
      return {
        buffer: mp4Buffer,
        skipped: true,
        reason: "probe_failed",
        durationsBefore: before,
        gapBefore,
        gapAfter: gapBefore,
      };
    }

    const maxGap = getMaxAvGapSec();
    if (gapBefore <= maxGap) {
      return {
        buffer: mp4Buffer,
        skipped: false,
        aligned: false,
        durationsBefore: before,
        durationsAfter: before,
        gapBefore,
        gapAfter: gapBefore,
        method: null,
      };
    }

    let method = null;
    if (audioSec + 0.02 < videoSec) {
      method = "pad_audio";
      const padDur = videoSec - audioSec;
      await runFfmpeg([
        "-y",
        "-i",
        inPath,
        "-c:v",
        "copy",
        "-af",
        `apad=pad_dur=${padDur.toFixed(3)}`,
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-movflags",
        "+faststart",
        outPath,
      ]);
    } else if (videoSec + 0.02 < audioSec) {
      method = "trim_video";
      await runFfmpeg([
        "-y",
        "-i",
        inPath,
        "-t",
        String(audioSec),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-c:a",
        "copy",
        "-movflags",
        "+faststart",
        outPath,
      ]);
    } else {
      return {
        buffer: mp4Buffer,
        skipped: false,
        aligned: false,
        durationsBefore: before,
        gapBefore,
        gapAfter: gapBefore,
        method: null,
      };
    }

    const outBuf = await fs.readFile(outPath);
    const after = await probeMediaDurations(outPath);
    const gapAfter = effectiveAvGapSec(after);
    return {
      buffer: outBuf.length >= 2048 ? outBuf : mp4Buffer,
      skipped: false,
      aligned: true,
      durationsBefore: before,
      durationsAfter: after,
      gapBefore,
      gapAfter,
      method,
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

function shouldRunI2VAvDurationQa(meta) {
  if (String(process.env.I2V_AV_DURATION_QA || "1").trim() === "0") {
    return false;
  }
  return meta && meta.workflow === "image_to_video";
}

function passesAvDurationQa(gapSec) {
  if (gapSec == null || !Number.isFinite(gapSec)) return true;
  return gapSec <= getMaxAvGapSec();
}

async function downloadVideoBuffer(url, timeoutMs = 45_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(String(url).trim(), {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Télécharge la vidéo Kie, aligne A/V si besoin, ré-upload R2.
 * @returns {Promise<{ ok: boolean, url: string|null, qa: object }>}
 */
async function downloadAlignAndStoreI2VVideo(larpId, sourceUrl) {
  const { uploadToR2 } = require("./r2");
  try {
    const rawBuffer = await downloadVideoBuffer(sourceUrl);
    const aligned = await alignVideoAudioInMp4Buffer(rawBuffer);
    const gapAfter = aligned.gapAfter ?? effectiveAvGapSec(aligned.durationsAfter);
    const qa = {
      gapBefore: aligned.gapBefore ?? null,
      gapAfter: gapAfter ?? null,
      aligned: aligned.aligned === true,
      method: aligned.method || null,
      skipped: aligned.skipped === true,
      reason: aligned.reason || null,
      durationsBefore: aligned.durationsBefore || null,
      durationsAfter: aligned.durationsAfter || null,
      maxGapSec: getMaxAvGapSec(),
    };

    if (!passesAvDurationQa(gapAfter)) {
      return { ok: false, url: null, qa, failReason: "av_duration_gap_exceeded" };
    }

    const outBuffer =
      aligned.buffer && aligned.buffer.length >= 2048 ? aligned.buffer : rawBuffer;
    const key = `larps/${larpId}/video.mp4`;
    const url = await uploadToR2(key, outBuffer, "video/mp4");
    return { ok: true, url, qa };
  } catch (err) {
    console.warn("[i2v-av-sync] downloadAlign failed", {
      larpId,
      err: err?.message || err,
    });
    return {
      ok: true,
      url: null,
      qa: { skipped: true, reason: "align_error" },
      fallback: true,
    };
  }
}

module.exports = {
  DEFAULT_MAX_AV_GAP_SEC,
  getMaxAvGapSec,
  I2VVoiceDurationExceedsTargetError,
  probeMediaDurations,
  effectiveAvGapSec,
  fitAudioBufferToDurationSec,
  buildSilentMp3Buffer,
  alignVideoAudioInMp4Buffer,
  shouldRunI2VAvDurationQa,
  passesAvDurationQa,
  downloadAlignAndStoreI2VVideo,
};
