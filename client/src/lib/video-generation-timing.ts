/** Miroir de api/_lib/video-timing.js — garder les deux synchronisés. */
const VIDEO_TIMING = {
  overheadSec: 25,
  i2v: {
    render5sSec: 105,
    render10sSec: 165,
    hdExtraSec: 30,
    voiceExtraSec: 20,
  },
  runwayAleph: { baseSec: 150, perSourceSec: 8 },
  klingMotion: { baseSec: 200, perSourceSec: 22, prepSec: 12 },
  sourceAudioMuxSec: 25,
  defaultSourceDurationSec: 8,
  minSec: 90,
  maxSec: 480,
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
    if ("prepSec" in provider && provider.prepSec) total += provider.prepSec;
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

/** Fallback loader quand l’API n’a pas encore renvoyé estimatedSeconds. */
export function defaultVideoLoaderEstimate(options: {
  workflow: "image_to_video" | "video_to_video";
  sourceVideoDurationSec?: number | null;
  durationSec?: number;
  voiceEnabled?: boolean;
  preserveSourceAudio?: boolean;
}): number {
  return estimateVideoGenerationSeconds({
    workflow: options.workflow,
    v2vProvider: options.workflow === "video_to_video" ? "kling_motion" : null,
    sourceVideoDurationSec: options.sourceVideoDurationSec,
    durationSec: options.durationSec ?? 5,
    quality: "standard",
    voiceEnabled: options.voiceEnabled,
    preserveSourceAudio: options.preserveSourceAudio,
  });
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Miroir de api/_lib/video-status-timing.js — ETA poll vidéo (courbe + overtime). */
export function computeVideoPollRemainingSeconds(
  estimatedSeconds: number,
  elapsedSec: number,
  phase: "generating" | "finalize" | "done" = "generating",
): number {
  const E = Math.max(30, Math.round(estimatedSeconds));
  const elapsed = Math.max(0, Math.floor(elapsedSec));

  if (phase === "done") return 0;
  if (phase === "finalize") {
    return Math.max(3, Math.min(12, 10 - Math.floor(elapsed / 4)));
  }

  if (elapsed < E) {
    const ratio = Math.max(0, 1 - elapsed / E);
    const curved = ratio ** 0.72 * E;
    return Math.max(1, Math.round(curved));
  }

  const overtime = elapsed - E;
  return Math.max(5, Math.round(48 - overtime / 2.5));
}

export function videoPollRemainingFromStart(
  estimatedSeconds: number,
  startedAtMs: number,
  nowMs: number = Date.now(),
): number {
  const elapsed = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  return computeVideoPollRemainingSeconds(estimatedSeconds, elapsed, "generating");
}
