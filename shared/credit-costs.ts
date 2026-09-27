/** Coûts crédits par action — source de vérité (client + doc pricing). */
export const IMAGE_CREDIT_COST = 10;

/** TTS — 10 crédits / minute (arrondi supérieur côté API). */
export const VOICE_CREDIT_COST = 10;

/** Fish clone ~0,50 € API. */
export const VOICE_CLONE_CREDIT_COST = 30;

/** I2V Kling 5 s 720p — forfait. */
export const VIDEO_I2V_CREDIT_COST = 85;

/** V2V Aleph (transformation objet/décor/véhicule), 3–8 s. */
export const VIDEO_V2V_ALEPH_CREDIT_COST = 85;

/** V2V Kling Motion, source 3–5 s (durée arrondie au supérieur). */
export const VIDEO_V2V_KLING_SHORT_CREDIT_COST = 85;

/** V2V Kling Motion, source 6–8 s. */
export const VIDEO_V2V_KLING_LONG_CREDIT_COST = 120;

/** @deprecated Utiliser computeV2VCreditCost — max Kling long. */
export const VIDEO_V2V_CREDIT_COST = VIDEO_V2V_KLING_LONG_CREDIT_COST;

/** @deprecated Alias I2V */
export const VIDEO_FLAT_CREDIT_COST = VIDEO_I2V_CREDIT_COST;

export const VIDEO_VOICE_EXTRA_CREDIT = 5;

export type V2VStudioProvider = "runway_aleph" | "kling_motion";

export function ceilVideoBillableSeconds(
  durationSec: number | null | undefined,
): number {
  const d = Number(durationSec);
  if (!Number.isFinite(d) || d <= 0) return 0;
  return Math.ceil(d);
}

/**
 * Vidéo → Vidéo : Aleph 85 cr fixe ; Kling 85 cr (≤5 s) ou 120 cr (≥6 s).
 */
export function computeV2VCreditCost(
  sourceVideoDurationSec: number | null | undefined,
  v2vProvider: V2VStudioProvider | null | undefined,
  isAdmin = false,
): number {
  if (isAdmin) return 0;
  const sec = ceilVideoBillableSeconds(sourceVideoDurationSec);
  if (v2vProvider === "runway_aleph") {
    return VIDEO_V2V_ALEPH_CREDIT_COST;
  }
  if (v2vProvider === "kling_motion") {
    return sec >= 6
      ? VIDEO_V2V_KLING_LONG_CREDIT_COST
      : VIDEO_V2V_KLING_SHORT_CREDIT_COST;
  }
  return sec >= 6
    ? VIDEO_V2V_KLING_LONG_CREDIT_COST
    : VIDEO_V2V_ALEPH_CREDIT_COST;
}

/** Borne basse / haute V2V pour équivalences pricing (Kling court vs long). */
export function v2vCreditCostRange(): { min: number; max: number } {
  return {
    min: VIDEO_V2V_ALEPH_CREDIT_COST,
    max: VIDEO_V2V_KLING_LONG_CREDIT_COST,
  };
}

export function computeVideoStudioCreditCost(params: {
  workflow?: "image_to_video" | "video_to_video";
  voiceEnabled?: boolean;
  preserveSourceAudio?: boolean;
  sourceVideoDurationSec?: number | null;
  v2vProvider?: V2VStudioProvider | null;
  isAdmin?: boolean;
}): number {
  if (params.isAdmin) return 0;
  let cost =
    params.workflow === "video_to_video"
      ? computeV2VCreditCost(
          params.sourceVideoDurationSec,
          params.v2vProvider,
          false,
        )
      : VIDEO_I2V_CREDIT_COST;
  if (params.workflow === "video_to_video") {
    if (params.preserveSourceAudio) cost += VIDEO_VOICE_EXTRA_CREDIT;
  } else if (params.voiceEnabled) {
    cost += VIDEO_VOICE_EXTRA_CREDIT;
  }
  return cost;
}
