/** Miroir de video-i2v-pricing.ts pour l’API Node (sans transpilation TS). */
const { VIDEO_I2V_CREDIT_COST, VIDEO_VOICE_EXTRA_CREDIT } = require("../api/_lib/credit-costs");

const ADMIN_I2V_5S_720P = 85;
const RUNWAY_I2V_MIN_BILLED_SEC = 5;
const RUNWAY_KIE_1080P_COST_FACTOR = 37 / 17;
const VIDEO_I2V_DISCOUNT_3S_SEC = 10;
const VIDEO_I2V_COGS_SAFETY_FACTOR = 1.35;
const COGS_5S_720P_USD = 0.39;

const VIDEO_I2V_DURATION_OPTIONS = [3, 5];

function worstCreditEurRate() {
  const topups = [
    { credits: 90, cents: 349 },
    { credits: 210, cents: 799 },
    { credits: 450, cents: 1499 },
  ];
  const subs = [
    { credits: 250, cents: 990 },
    { credits: 1200, cents: 2490 },
    { credits: 2850, cents: 4990 },
  ];
  let worst = Infinity;
  for (const p of [...topups, ...subs]) {
    const rate = p.cents / 100 / p.credits;
    if (rate < worst) worst = rate;
  }
  return worst;
}

function minCreditsToCoverCogs(cogsEur, creditRateEur) {
  if (creditRateEur <= 0) return Infinity;
  return Math.ceil(cogsEur / creditRateEur);
}

function normalizeI2VDurationSec(raw) {
  const n = Number(raw);
  if (n === 3) return 3;
  if (n === 10) return 5;
  return 5;
}

function normalizeI2VQuality(raw) {
  return raw === "high" ? "high" : "standard";
}

function estimateRunwayI2VApiCostUsd(params) {
  const quality = normalizeI2VQuality(params.quality);
  const factor = quality === "high" ? RUNWAY_KIE_1080P_COST_FACTOR : 1;
  return COGS_5S_720P_USD * factor;
}

function minProfitableI2VCredits(params) {
  const cogs = estimateRunwayI2VApiCostUsd(params);
  const raw = minCreditsToCoverCogs(
    cogs * VIDEO_I2V_COGS_SAFETY_FACTOR,
    worstCreditEurRate(),
  );
  return Math.max(1, raw);
}

function i2vBase5s720p(grid) {
  return grid === "admin_v2" ? ADMIN_I2V_5S_720P : VIDEO_I2V_CREDIT_COST;
}

function coreI2VCredits(duration, quality, grid) {
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

function computeImageToVideoCreditCost(params) {
  const grid = params.billingGrid ?? "prod";
  const duration = normalizeI2VDurationSec(params.durationSec);
  const quality = normalizeI2VQuality(params.quality);

  let cost = coreI2VCredits(duration, quality, grid);
  if (params.voiceEnabled) cost += VIDEO_VOICE_EXTRA_CREDIT;
  return cost;
}

function runwayProviderDurationSec(userDurationSec, quality) {
  const q = normalizeI2VQuality(quality);
  if (q === "high") return 5;
  const n = Number(userDurationSec);
  if (n === 10) return 10;
  return RUNWAY_I2V_MIN_BILLED_SEC;
}

module.exports = {
  VIDEO_I2V_DURATION_OPTIONS,
  RUNWAY_I2V_MIN_BILLED_SEC,
  RUNWAY_KIE_1080P_COST_FACTOR,
  VIDEO_I2V_DISCOUNT_3S_SEC,
  normalizeI2VDurationSec,
  normalizeI2VQuality,
  computeImageToVideoCreditCost,
  runwayProviderDurationSec,
  minProfitableI2VCredits,
  estimateRunwayI2VApiCostUsd,
};
