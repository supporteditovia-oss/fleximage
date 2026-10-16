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
const { normalizeI2VDurationSec } = require("../../shared/video-i2v-pricing.cjs");

/**
 * Durée livrée : celle demandée (3 ou 5 s), sauf si la voix dépasse → garder la phrase entière.
 */
function resolveI2VTargetDeliverSec(requestedSec, { audioSec, hasAudio }) {
  const requested = Math.max(0.5, normalizeI2VDurationSec(requestedSec));
  if (
    hasAudio &&
    Number.isFinite(audioSec) &&
    audioSec > requested + 0.05
  ) {
    return Math.max(requested, audioSec);
  }
  return requested;
}

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
  const hasAudioStream = /Audio:/i.test(banner);
  const [videoSec, audioSecRaw] = await Promise.all([
    hasVideo ? decodeStreamDuration("0:v:0") : Promise.resolve(null),
    hasAudioStream ? decodeStreamDuration("0:a:0") : Promise.resolve(null),
  ]);

  let audioSec = audioSecRaw;
  if (hasAudioStream && !Number.isFinite(audioSec)) {
    audioSec = formatSec ?? videoSec ?? null;
  }
  if (!hasAudioStream) audioSec = 0;

  return {
    formatSec,
    videoSec: videoSec ?? formatSec,
    audioSec,
    hasAudioStream,
  };
}

/**
 * Force vidéo + audio à deliverSec (tpad + apad) — corrige écarts post-Kie / trim / mix.
 */
async function sealAvToDeliverSecMp4Buffer(mp4Buffer, deliverSec) {
  const target = Math.max(0.5, Number(deliverSec) || 5);
  if (!ffmpegPath || !Buffer.isBuffer(mp4Buffer) || mp4Buffer.length < 2048) {
    return {
      buffer: mp4Buffer,
      durationsAfter: null,
      method: null,
      skipped: true,
    };
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "i2v-av-seal-"));
  const inPath = path.join(tmpDir, "in.mp4");
  const outPath = path.join(tmpDir, "out.mp4");
  try {
    await fs.writeFile(inPath, mp4Buffer);
    const before = await probeMediaDurations(inPath);
    if (!before.hasAudioStream) {
      return {
        buffer: mp4Buffer,
        durationsAfter: before,
        method: null,
        skipped: true,
        reason: "no_audio_stream",
      };
    }

    const videoSec = Number(before.videoSec ?? before.formatSec) || target;
    const audioSec = Number.isFinite(Number(before.audioSec))
      ? Number(before.audioSec)
      : videoSec;
    const videoPad = Math.max(0, target - videoSec);
    const audioPad = Math.max(0, target - audioSec);
    const t = target.toFixed(3);

    const args = [
      "-y",
      "-i",
      inPath,
      "-filter_complex",
      `[0:v]tpad=stop_mode=clone:stop_duration=${videoPad.toFixed(3)},trim=0:${t},setpts=PTS-STARTPTS[v];` +
        `[0:a]apad=pad_dur=${audioPad.toFixed(3)},atrim=0:${t},asetpts=PTS-STARTPTS[a]`,
      "-map",
      "[v]",
      "-map",
      "[a]",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      outPath,
    ];

    await runFfmpeg(args, 120_000);
    const outBuf = await fs.readFile(outPath);
    const after = await probeMediaDurations(outPath);
    return {
      buffer: outBuf.length >= 2048 ? outBuf : mp4Buffer,
      durationsAfter: after,
      method: "seal_av",
      skipped: false,
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function probeMp4BufferDurations(mp4Buffer) {
  if (!ffmpegPath || !Buffer.isBuffer(mp4Buffer) || mp4Buffer.length < 2048) {
    return null;
  }
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "i2v-probe-"));
  const inPath = path.join(tmpDir, "in.mp4");
  try {
    await fs.writeFile(inPath, mp4Buffer);
    return probeMediaDurations(inPath);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
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
      // Phrase plus longue que la durée UI : on garde l’audio entier, la vidéo sera étendue en post.
      return mp3Buffer;
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
 * Caler la livraison I2V avatar : durée ≥ demandée, phrase jamais coupée.
 * @returns {Promise<{ buffer: Buffer, deliverSec: number, durationsBefore, durationsAfter, gapBefore, gapAfter, method: string|null, skipped?: boolean, reason?: string }>}
 */
async function finalizeI2VAvatarMp4Buffer(mp4Buffer, { requestedSec }) {
  const requested = Math.max(0.5, normalizeI2VDurationSec(requestedSec));
  if (!ffmpegPath || !Buffer.isBuffer(mp4Buffer) || mp4Buffer.length < 2048) {
    return {
      buffer: mp4Buffer,
      deliverSec: requested,
      skipped: true,
      reason: "ffmpeg_or_buffer",
      gapBefore: null,
      gapAfter: null,
      durationsBefore: null,
      durationsAfter: null,
      method: null,
    };
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "i2v-av-finalize-"));
  const inPath = path.join(tmpDir, "in.mp4");
  const outPath = path.join(tmpDir, "out.mp4");
  try {
    await fs.writeFile(inPath, mp4Buffer);
    const before = await probeMediaDurations(inPath);
    const gapBefore = effectiveAvGapSec(before);
    const videoSec = Number(before.videoSec ?? before.formatSec);
    const audioSec = Number(before.audioSec);
    const hasAudioStream = before.hasAudioStream === true;
    const hasAudio =
      hasAudioStream &&
      (Number.isFinite(audioSec) ? audioSec > 0.05 : true);

    const deliverSec = resolveI2VTargetDeliverSec(requested, {
      audioSec,
      hasAudio,
    });

    const needVideoPad =
      Number.isFinite(videoSec) && videoSec + 0.04 < deliverSec;
    const needAudioPad =
      hasAudio && Number.isFinite(audioSec) && audioSec + 0.04 < deliverSec;
    const needTrimToTarget =
      (Number.isFinite(videoSec) && videoSec > deliverSec + 0.04) ||
      (hasAudio && Number.isFinite(audioSec) && audioSec > deliverSec + 0.04);

    if (needTrimToTarget && !needVideoPad && !needAudioPad) {
      await runFfmpeg(
        [
          "-y",
          "-i",
          inPath,
          "-t",
          String(deliverSec),
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          "20",
          "-c:a",
          "aac",
          "-b:a",
          "192k",
          "-movflags",
          "+faststart",
          outPath,
        ],
        120_000,
      );
      let outBuf = await fs.readFile(outPath);
      let after = await probeMediaDurations(outPath);
      let gapAfter = effectiveAvGapSec(after);
      let method = "trim_to_target";
      if (
        hasAudioStream &&
        (gapAfter == null || gapAfter > getMaxAvGapSec())
      ) {
        const sealed = await sealAvToDeliverSecMp4Buffer(outBuf, deliverSec);
        if (sealed.buffer && !sealed.skipped) {
          outBuf = sealed.buffer;
          after = sealed.durationsAfter ?? after;
          gapAfter = effectiveAvGapSec(after);
          method = "trim_to_target+seal_av";
        }
      }
      return {
        buffer: outBuf.length >= 2048 ? outBuf : mp4Buffer,
        deliverSec,
        skipped: false,
        aligned: true,
        durationsBefore: before,
        durationsAfter: after,
        gapBefore,
        gapAfter,
        method,
        kieVideoSec: Number.isFinite(videoSec) ? videoSec : null,
        kieAudioSec:
          hasAudioStream && Number.isFinite(audioSec) ? audioSec : null,
      };
    }

    if (!needVideoPad && !needAudioPad) {
      const within =
        Number.isFinite(videoSec) &&
        Math.abs(videoSec - deliverSec) <= getMaxAvGapSec() &&
        (!hasAudio ||
          !Number.isFinite(audioSec) ||
          Math.abs(audioSec - deliverSec) <= getMaxAvGapSec());
      if (within || !Number.isFinite(videoSec)) {
        return {
          buffer: mp4Buffer,
          deliverSec,
          skipped: false,
          aligned: false,
          durationsBefore: before,
          durationsAfter: before,
          gapBefore,
          gapAfter: gapBefore,
          method: null,
        };
      }
    }

    const videoPadSec = needVideoPad
      ? Math.max(0, deliverSec - (videoSec || 0))
      : 0;
    const audioPadSec = needAudioPad
      ? Math.max(0, deliverSec - (audioSec || 0))
      : 0;

    let method = "extend_av";
    const args = ["-y", "-i", inPath];

    if (needVideoPad && needAudioPad) {
      method = "extend_video_and_audio";
      args.push(
        "-vf",
        `tpad=stop_mode=clone:stop_duration=${videoPadSec.toFixed(3)}`,
        "-af",
        `apad=pad_dur=${audioPadSec.toFixed(3)}`,
      );
    } else if (needVideoPad) {
      method = "extend_video_freeze";
      args.push(
        "-vf",
        `tpad=stop_mode=clone:stop_duration=${videoPadSec.toFixed(3)}`,
        "-c:a",
        "copy",
      );
    } else if (needAudioPad) {
      method = "extend_audio_pad";
      args.push(
        "-c:v",
        "copy",
        "-af",
        `apad=pad_dur=${audioPadSec.toFixed(3)}`,
      );
    } else {
      return {
        buffer: mp4Buffer,
        deliverSec,
        skipped: false,
        aligned: false,
        durationsBefore: before,
        durationsAfter: before,
        gapBefore,
        gapAfter: gapBefore,
        method: null,
      };
    }

    if (method !== "extend_audio_pad") {
      args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "20");
    }
    if (method !== "extend_video_freeze") {
      args.push("-c:a", "aac", "-b:a", "192k");
    }
    args.push("-t", String(deliverSec), "-movflags", "+faststart", outPath);

    await runFfmpeg(args, 120_000);

    let outBuf = await fs.readFile(outPath);
    let after = await probeMediaDurations(outPath);
    let gapAfter = effectiveAvGapSec(after);
    if (hasAudioStream && (gapAfter == null || gapAfter > getMaxAvGapSec())) {
      const sealed = await sealAvToDeliverSecMp4Buffer(outBuf, deliverSec);
      if (sealed.buffer && !sealed.skipped) {
        outBuf = sealed.buffer;
        after = sealed.durationsAfter ?? after;
        gapAfter = effectiveAvGapSec(after);
        method = `${method}+seal_av`;
      }
    }
    return {
      buffer: outBuf.length >= 2048 ? outBuf : mp4Buffer,
      deliverSec,
      skipped: false,
      aligned: true,
      durationsBefore: before,
      durationsAfter: after,
      gapBefore,
      gapAfter,
      method,
      kieVideoSec: Number.isFinite(videoSec) ? videoSec : null,
      kieAudioSec:
        hasAudioStream && Number.isFinite(audioSec) ? audioSec : null,
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/** @deprecated — use finalizeI2VAvatarMp4Buffer */
async function alignVideoAudioInMp4Buffer(mp4Buffer) {
  return finalizeI2VAvatarMp4Buffer(mp4Buffer, { requestedSec: 5 });
}

function isI2VAvatarPipelineV2Enabled(meta) {
  return Boolean(meta && meta.i2v_avatar_pipeline_v2 === true);
}

/** Voix / lip-sync explicite — pas les animations I2V muettes (piste silencieuse pour Kling uniquement). */
function isI2VVoiceTrackRequested(meta) {
  if (!meta || meta.workflow !== "image_to_video") return false;
  if (meta.voice_enabled !== true) return false;
  const voiceText = String(meta.voice_text || "").trim();
  return voiceText.length >= 5;
}

function shouldRunI2VAvDurationQa(meta) {
  if (String(process.env.I2V_AV_DURATION_QA || "1").trim() === "0") {
    return false;
  }
  if (!meta || meta.workflow !== "image_to_video") return false;
  if (meta.i2v_provider !== "kling_ai_avatar_pro") return false;
  return isI2VVoiceTrackRequested(meta) || meta.voice_enabled === true;
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
async function downloadAlignAndStoreI2VVideo(larpId, sourceUrl, meta = {}) {
  const { uploadToR2 } = require("./r2");
  const { normalizeI2VDurationSec } = require("../../shared/video-i2v-pricing.cjs");
  try {
    const rawBuffer = await downloadVideoBuffer(sourceUrl);
    const requestedSec = normalizeI2VDurationSec(
      meta.duration_sec ?? meta.i2v_target_duration_sec ?? 5,
    );
    const aligned = await finalizeI2VAvatarMp4Buffer(rawBuffer, {
      requestedSec,
    });
    let gapAfter = aligned.gapAfter ?? effectiveAvGapSec(aligned.durationsAfter);
    const deliveredSec =
      aligned.durationsAfter?.videoSec ??
      aligned.durationsAfter?.formatSec ??
      aligned.deliverSec ??
      requestedSec;

    console.info("[i2v-av-sync] kie avatar delivery", {
      larpId,
      requestedSec,
      kieVideoSec: aligned.kieVideoSec ?? aligned.durationsBefore?.videoSec,
      kieAudioSec: aligned.kieAudioSec ?? aligned.durationsBefore?.audioSec,
      deliverSec: aligned.deliverSec,
      deliveredSec,
      gapBefore: aligned.gapBefore,
      gapAfter: gapAfter,
      method: aligned.method,
    });

    const qa = {
      gapBefore: aligned.gapBefore ?? null,
      gapAfter: gapAfter ?? null,
      aligned: aligned.aligned === true,
      method: aligned.method || null,
      skipped: aligned.skipped === true,
      reason: aligned.reason || null,
      durationsBefore: aligned.durationsBefore || null,
      durationsAfter: aligned.durationsAfter || null,
      requestedSec,
      deliverSec: aligned.deliverSec ?? requestedSec,
      deliveredSec,
      kieVideoSec: aligned.kieVideoSec ?? null,
      kieAudioSec: aligned.kieAudioSec ?? null,
      maxGapSec: getMaxAvGapSec(),
    };

    let outBuffer =
      aligned.buffer && aligned.buffer.length >= 2048 ? aligned.buffer : rawBuffer;

    if (!passesAvDurationQa(gapAfter)) {
      const sealed = await sealAvToDeliverSecMp4Buffer(
        outBuffer,
        aligned.deliverSec ?? requestedSec,
      );
      if (sealed.buffer && !sealed.skipped) {
        outBuffer = sealed.buffer;
        const gap2 = effectiveAvGapSec(sealed.durationsAfter);
        qa.repairPreMix = "seal_av";
        qa.gapAfterPreMix = gap2;
        if (passesAvDurationQa(gap2)) {
          gapAfter = gap2;
          qa.gapAfter = gap2;
          qa.durationsAfter = sealed.durationsAfter;
        }
      }
    }

    if (!passesAvDurationQa(gapAfter)) {
      return { ok: false, url: null, qa, failReason: "av_duration_gap_exceeded" };
    }

    const { mixI2VAudioLayersOnMp4Buffer } = require("./i2v-audio-mix");
    const mixOpts = {
      ambience: meta.i2v_ambience,
      sfx: meta.i2v_sfx,
      sfxMoment: meta.i2v_sfx_moment,
      voiceEnabled: meta.voice_enabled === true,
      deliverSec: deliveredSec,
    };
    let audioMix = await mixI2VAudioLayersOnMp4Buffer(outBuffer, mixOpts);
    const { normalizeI2VAmbience } = require("../../shared/i2v-ambience.cjs");
    const { normalizeI2VSfx } = require("../../shared/i2v-sfx.cjs");
    const ambNorm = normalizeI2VAmbience(mixOpts.ambience);
    const sfxNorm = normalizeI2VSfx(mixOpts.sfx);
    if (
      !audioMix.mixed &&
      (ambNorm !== "none" || sfxNorm !== "none") &&
      audioMix.reason === "mix_failed"
    ) {
      console.warn("[i2v-av-sync] audio mix retry", { larpId });
      audioMix = await mixI2VAudioLayersOnMp4Buffer(outBuffer, mixOpts);
      qa.mixRetried = true;
    }
    qa.sfx = audioMix.sfx ?? null;
    if (meta.i2v_sound_auto && typeof meta.i2v_sound_auto === "object") {
      const sa = meta.i2v_sound_auto;
      qa.sound_auto = {
        ambiance: sa.applied?.ambiance ?? null,
        sfx: sa.applied?.sfx ?? null,
        moment: sa.applied?.moment ?? null,
        confidence: sa.detection?.confidence ?? null,
        overridden: sa.overridden === true,
        label_fr: sa.detection?.label_fr ?? null,
      };
    }
    if (audioMix.mixed) {
      outBuffer = audioMix.buffer;
      if (audioMix.ambience) qa.ambience = audioMix.ambience;
      if (audioMix.sfxMoment) qa.sfx_moment = audioMix.sfxMoment;
      const afterMix = await probeMp4BufferDurations(outBuffer);
      let gapMix = effectiveAvGapSec(afterMix);
      if (afterMix) qa.durationsAfterMix = afterMix;
      if (!passesAvDurationQa(gapMix)) {
        const sealed = await sealAvToDeliverSecMp4Buffer(
          outBuffer,
          aligned.deliverSec ?? requestedSec,
        );
        if (sealed.buffer && !sealed.skipped) {
          outBuffer = sealed.buffer;
          gapMix = effectiveAvGapSec(sealed.durationsAfter);
          qa.repairPostMix = "seal_av";
          qa.gapAfterMix = gapMix;
        }
      }
      if (!passesAvDurationQa(gapMix)) {
        return {
          ok: false,
          url: null,
          qa: { ...qa, gapAfterMix: gapMix, failReason: "av_duration_gap_after_mix" },
          failReason: "av_duration_gap_exceeded",
        };
      }
    } else {
      if (audioMix.ambience) {
        qa.ambience_skipped = audioMix.reason || "not_mixed";
      }
      if (audioMix.sfx) {
        qa.sfx_skipped = audioMix.reason || "not_mixed";
      }
    }

    const key = `larps/${larpId}/video.mp4`;
    const url = await uploadToR2(key, outBuffer, "video/mp4");
    return { ok: true, url, qa, deliveredSec };
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
  resolveI2VTargetDeliverSec,
  I2VVoiceDurationExceedsTargetError,
  probeMediaDurations,
  effectiveAvGapSec,
  fitAudioBufferToDurationSec,
  buildSilentMp3Buffer,
  finalizeI2VAvatarMp4Buffer,
  alignVideoAudioInMp4Buffer,
  isI2VAvatarPipelineV2Enabled,
  isI2VVoiceTrackRequested,
  shouldRunI2VAvDurationQa,
  passesAvDurationQa,
  downloadAlignAndStoreI2VVideo,
  sealAvToDeliverSecMp4Buffer,
  probeMp4BufferDurations,
};
