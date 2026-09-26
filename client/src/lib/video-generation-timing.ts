/** Miroir de api/_lib/video-timing.js — garder les deux synchronisés. */
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
} as const;

export type VideoTimingInput = {
  workflow: "image_to_video" | "video_to_video";
  durationSec?: number | null;
  quality?: "standard" | "high";
  voiceEnabled?: boolean;
  v2vProvider?: "kling_motion" | "runway_aleph" | null;
  sourceVideoDurationSec?: number | null;
  preserveSourceAudio?: boolean;
};

export function estimateVideoGenerationSeconds(input: VideoTimingInput): number {
  const t = VIDEO_TIMING;
  let total: number = t.overheadSec;

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
    total +=
      Number(input.durationSec) === 10 ? t.i2v.render10sSec : t.i2v.render5sSec;
    if (input.quality === "high") total += t.i2v.hdExtraSec;
    if (input.voiceEnabled) total += t.i2v.voiceExtraSec;
  }

  const rounded = Math.ceil(total / 5) * 5;
  return Math.min(t.maxSec, Math.max(t.minSec, rounded));
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
