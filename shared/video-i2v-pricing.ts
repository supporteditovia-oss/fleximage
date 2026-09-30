import {
  VIDEO_I2V_CREDIT_COST,
  VIDEO_VOICE_EXTRA_CREDIT,
} from "./credit-costs";
import { PRICING_ECONOMICS } from "./pricing-economics";

/** Durées I2V proposées au studio (Kling / Runway via Kie). */
export const VIDEO_I2V_DURATION_OPTIONS = [3, 5] as const;
export type VideoI2VDurationSec = (typeof VIDEO_I2V_DURATION_OPTIONS)[number];

export type VideoI2VQuality = "standard" | "high";

/** +20 cr (grille v2) / même ratio sur prod pour 5 s vs 3 s. */
export const VIDEO_I2V_EXTRA_DURATION_5S = 20;
/** +15 cr pour 1080p (standard = 720p). */
export const VIDEO_I2V_EXTRA_QUALITY_HIGH = 15;

export function normalizeI2VDurationSec(raw: unknown): VideoI2VDurationSec {
  const n = Number(raw);
  if (n === 3) return 3;
  if (n === 10) return 5;
  return 5;
}

export function normalizeI2VQuality(raw: unknown): VideoI2VQuality {
  return raw === "high" ? "high" : "standard";
}

export type VideoI2VBillingGrid = "prod" | "admin_v2";

function i2vBase720p3s(grid: VideoI2VBillingGrid): number {
  const base5 =
    grid === "admin_v2"
      ? PRICING_ECONOMICS.creditCosts.videoI2V
      : VIDEO_I2V_CREDIT_COST;
  return base5 - VIDEO_I2V_EXTRA_DURATION_5S;
}

/** Coût I2V sans voix — durée + qualité (720p = standard). */
export function computeImageToVideoCreditCost(params: {
  durationSec?: unknown;
  quality?: unknown;
  voiceEnabled?: boolean;
  billingGrid?: VideoI2VBillingGrid;
}): number {
  const grid = params.billingGrid ?? "prod";
  const duration = normalizeI2VDurationSec(params.durationSec);
  const quality = normalizeI2VQuality(params.quality);

  let cost = i2vBase720p3s(grid);
  if (duration === 5) cost += VIDEO_I2V_EXTRA_DURATION_5S;
  if (quality === "high") cost += VIDEO_I2V_EXTRA_QUALITY_HIGH;
  if (params.voiceEnabled) cost += VIDEO_VOICE_EXTRA_CREDIT;
  return cost;
}

export function i2vQualityLabel(quality: VideoI2VQuality): "720p" | "1080p" {
  return quality === "high" ? "1080p" : "720p";
}
