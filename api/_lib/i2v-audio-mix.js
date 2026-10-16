/**
 * Post-génération I2V : mix voix (piste Kie) + ambiance + effet ponctuel (FFmpeg).
 */
const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");

const { normalizeI2VAmbience } = require("../../shared/i2v-ambience.cjs");
const {
  normalizeI2VSfx,
  normalizeI2VSfxMoment,
  I2V_SFX_IDS,
} = require("../../shared/i2v-sfx.cjs");

let ffmpegPath = null;
try {
  ffmpegPath = require("ffmpeg-static");
} catch {
  ffmpegPath = null;
}

const execFileAsync = promisify(execFile);

const AMBIENCE_VOLUME = 0.25;
const SFX_VOLUME = 0.8;
/** Cible approximative quand la voix parle (sidechain sur la piste voix). */
const SFX_SIDECHAIN_RATIO = 3.2;

function siteAssetBaseUrl() {
  return String(
    process.env.SITE_URL ||
      process.env.VITE_PUBLIC_APP_URL ||
      "https://www.luxeflexia.com",
  ).replace(/\/$/, "");
}

function localAssetPath(folder, kind) {
  return path.join(
    process.cwd(),
    "client",
    "public",
    "assets",
    folder,
    `${kind}.mp3`,
  );
}

function publicAssetUrl(folder, kind) {
  return `${siteAssetBaseUrl()}/assets/${folder}/${kind}.mp3`;
}

async function resolveAssetMp3Path(folder, kind, tmpDir, prefix) {
  const local = localAssetPath(folder, kind);
  try {
    await fs.access(local);
    return local;
  } catch {
    /* Vercel : assets statiques */
  }
  const url = publicAssetUrl(folder, kind);
  const dest = path.join(tmpDir, `${prefix}-${kind}.mp3`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 512) throw new Error("asset_too_small");
    await fs.writeFile(dest, buf);
    return dest;
  } finally {
    clearTimeout(timer);
  }
}

function parseDurationFromFfmpegBanner(text) {
  const m = String(text || "").match(
    /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/,
  );
  if (!m) return null;
  return (
    Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(parseFloat(m[3]))
  );
}

async function probeFormatSec(filePath) {
  if (!ffmpegPath) return null;
  try {
    await execFileAsync(ffmpegPath, ["-hide_banner", "-i", filePath], {
      timeout: 45_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    return null;
  } catch (err) {
    return parseDurationFromFfmpegBanner(err.stderr || "");
  }
}

/**
 * Position de départ du SFX sur la timeline vidéo (secondes).
 * @param {"start"|"middle"|"end"} moment
 */
function computeSfxStartSec(moment, videoSec, sfxSec) {
  const v = Math.max(0.1, Number(videoSec) || 5);
  const s = Math.max(0.05, Math.min(Number(sfxSec) || 1, v));
  const m = normalizeI2VSfxMoment(moment);
  if (m === "start") return 0;
  if (m === "end") return Math.max(0, v - s);
  return Math.max(0, (v - s) / 2);
}

function buildAudioFilterGraph({
  hasAmbience,
  hasSfx,
  videoSec,
  sfxStartSec,
  sfxPlaySec,
  voiceSidechain,
}) {
  const parts = [];
  let mixInputs = ["[0:a]"];
  let inputCount = 1;

  if (hasAmbience) {
    parts.push(
      `[${inputCount}:a]aloop=loop=-1:size=2e+09,atrim=0:${videoSec.toFixed(3)},asetpts=PTS-STARTPTS,volume=${AMBIENCE_VOLUME}[amb]`,
    );
    mixInputs.push("[amb]");
    inputCount += 1;
  }

  if (hasSfx) {
    const delayMs = Math.round(Math.max(0, sfxStartSec) * 1000);
    const sfxInIdx = inputCount;
    parts.push(
      `[${sfxInIdx}:a]atrim=0:${sfxPlaySec.toFixed(3)},asetpts=PTS-STARTPTS,adelay=${delayMs}|${delayMs},volume=${SFX_VOLUME}[sfxraw]`,
    );
    if (voiceSidechain) {
      parts.push(
        `[sfxraw][0:a]sidechaincompress=threshold=0.018:ratio=${SFX_SIDECHAIN_RATIO}:attack=6:release=140:level_sc=1[sfx]`,
      );
      mixInputs.push("[sfx]");
    } else {
      mixInputs.push("[sfxraw]");
    }
    inputCount += 1;
  }

  parts.push(
    `${mixInputs.join("")}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=0[aout]`,
  );
  return parts.join(";");
}

/**
 * @param {Buffer} mp4Buffer
 * @param {{ ambience?: string, sfx?: string, sfxMoment?: string, voiceEnabled?: boolean }} opts
 */
async function mixI2VAudioLayersOnMp4Buffer(mp4Buffer, opts = {}) {
  const ambience = normalizeI2VAmbience(opts.ambience);
  const sfx = normalizeI2VSfx(opts.sfx);
  const sfxMoment = normalizeI2VSfxMoment(opts.sfxMoment);
  const voiceSidechain = opts.voiceEnabled !== false;

  if (ambience === "none" && sfx === "none") {
    return {
      buffer: mp4Buffer,
      mixed: false,
      ambience,
      sfx: null,
      sfxMoment: null,
    };
  }

  if (!ffmpegPath || !Buffer.isBuffer(mp4Buffer) || mp4Buffer.length < 2048) {
    return {
      buffer: mp4Buffer,
      mixed: false,
      ambience,
      sfx: sfx === "none" ? null : sfx,
      sfxMoment: sfx === "none" ? null : sfxMoment,
      reason: "ffmpeg_or_buffer",
    };
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "i2v-audio-mix-"));
  const inPath = path.join(tmpDir, "in.mp4");
  const outPath = path.join(tmpDir, "out.mp4");

  try {
    await fs.writeFile(inPath, mp4Buffer);
    const videoSec =
      (await probeFormatSec(inPath)) ??
      Number(opts.deliverSec) ??
      5;
    const hasAmbience = ambience !== "none";
    const hasSfx = sfx !== "none";

    let ambPath = null;
    let sfxPath = null;
    if (hasAmbience) {
      ambPath = await resolveAssetMp3Path(
        "i2v-ambience",
        ambience,
        tmpDir,
        "amb",
      );
    }
    if (hasSfx) {
      sfxPath = await resolveAssetMp3Path("i2v-sfx", sfx, tmpDir, "sfx");
    }

    const sfxFileSec = hasSfx ? (await probeFormatSec(sfxPath)) ?? 4 : 0;
    const sfxPlaySec = Math.min(
      sfxFileSec,
      Math.max(0.2, videoSec - 0.05),
    );
    const sfxStartSec = hasSfx
      ? computeSfxStartSec(sfxMoment, videoSec, sfxPlaySec)
      : 0;

    const filter = buildAudioFilterGraph({
      hasAmbience,
      hasSfx,
      videoSec,
      sfxStartSec,
      sfxPlaySec,
      voiceSidechain,
    });

    const ffArgs = ["-y", "-i", inPath];
    if (hasAmbience) ffArgs.push("-stream_loop", "-1", "-i", ambPath);
    if (hasSfx) ffArgs.push("-i", sfxPath);
    ffArgs.push(
      "-filter_complex",
      filter,
      "-map",
      "0:v",
      "-map",
      "[aout]",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      outPath,
    );

    await execFileAsync(ffmpegPath, ffArgs, {
      timeout: 120_000,
      maxBuffer: 12 * 1024 * 1024,
    });

    const out = await fs.readFile(outPath);
    return {
      buffer: out.length >= 2048 ? out : mp4Buffer,
      mixed: out.length >= 2048,
      ambience: hasAmbience ? ambience : null,
      sfx: hasSfx ? sfx : null,
      sfxMoment: hasSfx ? sfxMoment : null,
      sfxStartSec: hasSfx ? sfxStartSec : null,
    };
  } catch (err) {
    console.warn("[i2v-audio-mix] skip", err?.message || err);
    return {
      buffer: mp4Buffer,
      mixed: false,
      ambience: ambience !== "none" ? ambience : null,
      sfx: sfx !== "none" ? sfx : null,
      sfxMoment: sfx !== "none" ? sfxMoment : null,
      reason: "mix_failed",
      detail: err?.message || String(err),
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Rétrocompat : ambiance seule. */
async function mixI2VAmbienceOnMp4Buffer(mp4Buffer, ambienceRaw) {
  const r = await mixI2VAudioLayersOnMp4Buffer(mp4Buffer, {
    ambience: ambienceRaw,
    sfx: "none",
  });
  return {
    buffer: r.buffer,
    mixed: r.mixed && r.ambience != null,
    ambience: normalizeI2VAmbience(ambienceRaw),
    reason: r.reason,
    detail: r.detail,
  };
}

module.exports = {
  AMBIENCE_VOLUME,
  SFX_VOLUME,
  computeSfxStartSec,
  buildAudioFilterGraph,
  mixI2VAudioLayersOnMp4Buffer,
  mixI2VAmbienceOnMp4Buffer,
  I2V_SFX_IDS,
  normalizeI2VSfx,
  normalizeI2VSfxMoment,
};
