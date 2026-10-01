export type VideoUltraDurationSec = 3 | 4 | 5 | 6 | 7 | 8;
export type VideoUltraResolution = "720p" | "1080p" | "4k";

/** Crédits LuxeFlexIA — grille Transformation Pro / Vidéo Ultra. */
export const VIDEO_ULTRA_CREDIT_GRID: Record<
  VideoUltraDurationSec,
  Record<VideoUltraResolution, number>
> = {
  3: { "720p": 36, "1080p": 48, "4k": 120 },
  4: { "720p": 48, "1080p": 64, "4k": 160 },
  5: { "720p": 60, "1080p": 80, "4k": 200 },
  6: { "720p": 72, "1080p": 96, "4k": 240 },
  7: { "720p": 84, "1080p": 112, "4k": 280 },
  8: { "720p": 96, "1080p": 128, "4k": 320 },
};

export const VIDEO_ULTRA_DURATION_OPTIONS: VideoUltraDurationSec[] = [
  3, 4, 5, 6, 7, 8,
];

export const VIDEO_ULTRA_RESOLUTION_OPTIONS: VideoUltraResolution[] = [
  "720p",
  "1080p",
  "4k",
];

export function normalizeVideoUltraDuration(raw: unknown): VideoUltraDurationSec {
  const n = Math.round(Number(raw));
  if (n >= 3 && n <= 8) return n as VideoUltraDurationSec;
  return 5;
}

export function normalizeVideoUltraResolution(
  raw: unknown,
): VideoUltraResolution {
  const s = String(raw || "").toLowerCase();
  if (s === "1080p") return "1080p";
  if (s === "4k" || s === "4K") return "4k";
  return "720p";
}

export function computeVideoUltraCreditCost(params: {
  durationSec?: unknown;
  resolution?: unknown;
}): number {
  const duration = normalizeVideoUltraDuration(params.durationSec);
  const resolution = normalizeVideoUltraResolution(params.resolution);
  return VIDEO_ULTRA_CREDIT_GRID[duration][resolution];
}

/** Vidéo → Vidéo (studio) : grille durée × qualité + option voix source. */
export function computeV2VStudioCreditCost(params: {
  sourceVideoDurationSec?: number | null;
  resolution?: unknown;
  preserveSourceAudio?: boolean;
  voiceExtraCredit?: number;
}): number {
  const duration = normalizeVideoUltraDuration(
    params.sourceVideoDurationSec ?? 5,
  );
  let cost = computeVideoUltraCreditCost({
    durationSec: duration,
    resolution: params.resolution,
  });
  const voiceExtra = params.voiceExtraCredit ?? 5;
  if (params.preserveSourceAudio) cost += voiceExtra;
  return cost;
}
