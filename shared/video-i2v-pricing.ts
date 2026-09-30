import {
  VIDEO_I2V_CREDIT_COST,
  VIDEO_VOICE_EXTRA_CREDIT,
} from "./credit-costs";
import {
  creditEurRate,
  creditEurRateFromTopup,
  minCreditsToCoverCogs,
  PRICING_ECONOMICS,
  type SubscriptionPackId,
} from "./pricing-economics";

/** Durées I2V proposées au studio (Kling / Runway via Kie). */
export const VIDEO_I2V_DURATION_OPTIONS = [3, 5] as const;
export type VideoI2VDurationSec = (typeof VIDEO_I2V_DURATION_OPTIONS)[number];

export type VideoI2VQuality = "standard" | "high";

/**
 * Runway (Kie) ne facture que 5 s ou 10 s — pas 3 s.
 * Le 1080p n’est autorisé qu’en 5 s. On envoie toujours ≥5 s au provider.
 */
export const RUNWAY_I2V_MIN_BILLED_SEC = 5;

/** Ratio coût Kie observé : 5 s 1080p (37 cr) / 5 s 720p (17 cr). */
export const RUNWAY_KIE_1080P_COST_FACTOR = 37 / 17;

/** Remise UX 3 s (clip resserré) — l’API reste facturée 5 s minimum. */
export const VIDEO_I2V_DISCOUNT_3S_SEC = 10;

/** Marge min vs COGS au pire €/crédit (pack Mini Boost). */
export const VIDEO_I2V_COGS_SAFETY_FACTOR = 1.35;

const ADMIN_I2V_5S_720P = PRICING_ECONOMICS.creditCosts.videoI2V;

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

function i2vBase5s720p(grid: VideoI2VBillingGrid): number {
  return grid === "admin_v2" ? ADMIN_I2V_5S_720P : VIDEO_I2V_CREDIT_COST;
}

/** COGS variable Runway I2V (USD ≈ EUR dans pricing-economics). */
export function estimateRunwayI2VApiCostUsd(params: {
  durationSec?: unknown;
  quality?: unknown;
}): number {
  const quality = normalizeI2VQuality(params.quality);
  const base = PRICING_ECONOMICS.unitCosts.videoI2V_5s_720p_noAudio.cost;
  const factor = quality === "high" ? RUNWAY_KIE_1080P_COST_FACTOR : 1;
  void normalizeI2VDurationSec(params.durationSec);
  return base * factor;
}

function worstCreditEurRate(): number {
  const packs = PRICING_ECONOMICS.audioTopups;
  let worst = Infinity;
  for (const p of packs) {
    worst = Math.min(worst, creditEurRateFromTopup(p.credits, p.priceTtcCents));
  }
  for (const packId of ["decouverte", "essentiel", "ultimate"] as SubscriptionPackId[]) {
    worst = Math.min(worst, creditEurRate(packId));
  }
  return worst;
}

/** Plancher crédits pour ne pas vendre sous le COGS (pire pack + marge). */
export function minProfitableI2VCredits(params: {
  durationSec?: unknown;
  quality?: unknown;
}): number {
  const cogs = estimateRunwayI2VApiCostUsd(params);
  const raw = minCreditsToCoverCogs(
    cogs * VIDEO_I2V_COGS_SAFETY_FACTOR,
    worstCreditEurRate(),
  );
  return Math.max(1, raw);
}

/** Durée réellement envoyée à Runway/Kie. */
export function runwayProviderDurationSec(
  userDurationSec: unknown,
  quality?: unknown,
): 5 | 10 {
  const q = normalizeI2VQuality(quality);
  if (q === "high") return 5;
  const n = Number(userDurationSec);
  if (n === 10) return 10;
  return RUNWAY_I2V_MIN_BILLED_SEC;
}

function coreI2VCredits(
  duration: VideoI2VDurationSec,
  quality: VideoI2VQuality,
  grid: VideoI2VBillingGrid,
): number {
  const base5_720 = i2vBase5s720p(grid);
  let credits =
    quality === "high"
      ? Math.ceil(base5_720 * RUNWAY_KIE_1080P_COST_FACTOR)
      : base5_720;
  if (duration === 3) {
    credits = Math.max(
      minProfitableI2VCredits({ durationSec: 3, quality }),
      credits - VIDEO_I2V_DISCOUNT_3S_SEC,
    );
  }
  return Math.max(
    minProfitableI2VCredits({ durationSec: duration, quality }),
    credits,
  );
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

  let cost = coreI2VCredits(duration, quality, grid);
  if (params.voiceEnabled) cost += VIDEO_VOICE_EXTRA_CREDIT;
  return cost;
}

/** Hint UI : surcoût 5 s vs 3 s (720p). */
export function i2vDuration5sExtraCredits(grid: VideoI2VBillingGrid): number {
  return (
    coreI2VCredits(5, "standard", grid) - coreI2VCredits(3, "standard", grid)
  );
}

/** Hint UI : surcoût 1080p vs 720p (5 s). */
export function i2vQuality1080ExtraCredits(grid: VideoI2VBillingGrid): number {
  return (
    coreI2VCredits(5, "high", grid) - coreI2VCredits(5, "standard", grid)
  );
}

export function i2vQualityLabel(quality: VideoI2VQuality): "720p" | "1080p" {
  return quality === "high" ? "1080p" : "720p";
}
