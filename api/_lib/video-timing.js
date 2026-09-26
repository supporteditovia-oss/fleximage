/**
 * Durées réelles observées (KIE) — clic → vidéo stockée sur R2.
 * Inclut upload + Gemini (~10 s) et téléchargement/stockage final (~10 s).
 * Miroir client : client/src/lib/video-generation-timing.ts
 */
const VIDEO_TIMING = {
  overheadSec: 20,
  i2v: {
    render5sSec: 100,
    render10sSec: 160,
    hdExtraSec: 30,
    voiceExtraSec: 15,
  },
  runwayAleph: { baseSec: 150, perSourceSec: 8 },
  klingMotion: { baseSec: 180, perSourceSec: 12 },
  sourceAudioMuxSec: 20,
  defaultSourceDurationSec: 8,
  minSec: 60,
  maxSec: 420,
};

function roundUpTo5(value) {
  return Math.ceil(value / 5) * 5;
}

function estimateVideoGenerationSeconds(input = {}) {
  const t = VIDEO_TIMING;
  let total = t.overheadSec;

  if (input.workflow === "video_to_video") {
    const rawSrc = Number(input.sourceVideoDurationSec);
    const src =
      Number.isFinite(rawSrc) && rawSrc > 0
        ? Math.min(rawSrc, t.defaultSourceDurationSec)
        : t.defaultSourceDurationSec;
    const provider =
      input.v2vProvider === "runway_aleph" ? t.runwayAleph : t.klingMotion;
    total += provider.baseSec + provider.perSourceSec * src;
    if (input.preserveSourceAudio) total += t.sourceAudioMuxSec;
  } else {
    total += Number(input.durationSec) === 10 ? t.i2v.render10sSec : t.i2v.render5sSec;
    if (input.quality === "high") total += t.i2v.hdExtraSec;
    if (input.voiceEnabled) total += t.i2v.voiceExtraSec;
  }

  return Math.min(t.maxSec, Math.max(t.minSec, roundUpTo5(total)));
}

module.exports = { VIDEO_TIMING, estimateVideoGenerationSeconds };
