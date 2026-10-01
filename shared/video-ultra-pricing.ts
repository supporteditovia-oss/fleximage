export type VideoUltraDurationSec = 3 | 4 | 5 | 6 | 7 | 8;
export type VideoUltraResolution = "720p" | "1080p" | "4k";

/**
 * Crédits LuxeFlexIA — V2V Transform (Omni 1080p/4K) + Vidéo Ultra.
 * 720p : prix FIXE (Runway Aleph ~0,55 $/clip quelle que soit la durée 3–8 s).
 * 1080p / 4K : linéaire (~16 cr/s et ~40 cr/s — Kling Omni facture à la seconde).
 */
export const V2V_TRANSFORM_720P_FIXED_CREDITS = 85;

export const VIDEO_ULTRA_CREDIT_GRID: Record<
  VideoUltraDurationSec,
  Record<VideoUltraResolution, number>
> = {
  3: { "720p": V2V_TRANSFORM_720P_FIXED_CREDITS, "1080p": 48, "4k": 120 },
  4: { "720p": V2V_TRANSFORM_720P_FIXED_CREDITS, "1080p": 64, "4k": 160 },
  5: { "720p": V2V_TRANSFORM_720P_FIXED_CREDITS, "1080p": 80, "4k": 200 },
  6: { "720p": V2V_TRANSFORM_720P_FIXED_CREDITS, "1080p": 96, "4k": 240 },
  7: { "720p": V2V_TRANSFORM_720P_FIXED_CREDITS, "1080p": 112, "4k": 280 },
  8: { "720p": V2V_TRANSFORM_720P_FIXED_CREDITS, "1080p": 128, "4k": 320 },
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

/**
 * Motion Control (danse / corps) — crédits arrondis (×5), +10 cr / s en 720p à partir de 5 s.
 * Réf. COGS ~1,01 $ / 8 s 720p ; 5 s = 60 / 90 cr (pas de 59/89).
 */
export const V2V_MOTION_CREDIT_GRID: Record<
  VideoUltraDurationSec,
  Record<"720p" | "1080p", number>
> = {
  3: { "720p": 55, "1080p": 85 },
  4: { "720p": 55, "1080p": 85 },
  5: { "720p": 60, "1080p": 90 },
  6: { "720p": 70, "1080p": 110 },
  7: { "720p": 80, "1080p": 120 },
  8: { "720p": 90, "1080p": 135 },
};

/** @deprecated Référence PnL — préférer V2V_MOTION_CREDIT_GRID */
export const V2V_MOTION_8S_720P_CREDITS = 90;

export type V2VStudioEngineFamily = "motion" | "transform";

export function v2vEngineFamilyFromProvider(
  provider: string | null | undefined,
): V2VStudioEngineFamily {
  return provider === "kling_motion" ? "motion" : "transform";
}

export function computeV2VMotionCreditCost(params: {
  durationSec?: unknown;
  resolution?: unknown;
}): number {
  const duration = normalizeVideoUltraDuration(params.durationSec ?? 5);
  let resolution = normalizeVideoUltraResolution(params.resolution);
  if (resolution === "4k") resolution = "1080p";
  return V2V_MOTION_CREDIT_GRID[duration][resolution];
}

/** Transform (décor / voiture) : grille Omni / Aleph — 720p → 4K. */
export function computeV2VTransformCreditCost(params: {
  durationSec?: unknown;
  resolution?: unknown;
}): number {
  return computeVideoUltraCreditCost({
    durationSec: params.durationSec,
    resolution: params.resolution,
  });
}

export function v2vResolutionsForEngineFamily(
  family: V2VStudioEngineFamily,
): VideoUltraResolution[] {
  return family === "motion"
    ? ["720p", "1080p"]
    : ["720p", "1080p", "4k"];
}

/** Vidéo → Vidéo : tarif selon moteur (motion ≠ transform). */
export function computeV2VStudioCreditCost(params: {
  sourceVideoDurationSec?: number | null;
  resolution?: unknown;
  preserveSourceAudio?: boolean;
  voiceExtraCredit?: number;
  engineFamily?: V2VStudioEngineFamily | null;
  v2vProvider?: string | null;
}): number {
  const duration = normalizeVideoUltraDuration(
    params.sourceVideoDurationSec ?? 5,
  );
  const family =
    params.engineFamily ??
    v2vEngineFamilyFromProvider(params.v2vProvider ?? null);
  let cost =
    family === "motion"
      ? computeV2VMotionCreditCost({
          durationSec: duration,
          resolution: params.resolution,
        })
      : computeV2VTransformCreditCost({
          durationSec: duration,
          resolution: params.resolution,
        });
  const voiceExtra = params.voiceExtraCredit ?? 5;
  if (params.preserveSourceAudio) cost += voiceExtra;
  return cost;
}
