/** Miroir de video-i2v-pricing.ts pour l’API Node (sans transpilation TS). */
const { VIDEO_I2V_CREDIT_COST, VIDEO_VOICE_EXTRA_CREDIT } = require("../api/_lib/credit-costs");

const ADMIN_VIDEO_I2V_5S_720P = 85;

const VIDEO_I2V_DURATION_OPTIONS = [3, 5];
const VIDEO_I2V_EXTRA_DURATION_5S = 20;
const VIDEO_I2V_EXTRA_QUALITY_HIGH = 15;

function normalizeI2VDurationSec(raw) {
  const n = Number(raw);
  if (n === 3) return 3;
  if (n === 10) return 5;
  return 5;
}

function normalizeI2VQuality(raw) {
  return raw === "high" ? "high" : "standard";
}

function i2vBase720p3s(grid) {
  const base5 = grid === "admin_v2" ? ADMIN_VIDEO_I2V_5S_720P : VIDEO_I2V_CREDIT_COST;
  return base5 - VIDEO_I2V_EXTRA_DURATION_5S;
}

function computeImageToVideoCreditCost(params) {
  const grid = params.billingGrid ?? "prod";
  const duration = normalizeI2VDurationSec(params.durationSec);
  const quality = normalizeI2VQuality(params.quality);

  let cost = i2vBase720p3s(grid);
  if (duration === 5) cost += VIDEO_I2V_EXTRA_DURATION_5S;
  if (quality === "high") cost += VIDEO_I2V_EXTRA_QUALITY_HIGH;
  if (params.voiceEnabled) cost += VIDEO_VOICE_EXTRA_CREDIT;
  return cost;
}

module.exports = {
  VIDEO_I2V_DURATION_OPTIONS,
  VIDEO_I2V_EXTRA_DURATION_5S,
  VIDEO_I2V_EXTRA_QUALITY_HIGH,
  normalizeI2VDurationSec,
  normalizeI2VQuality,
  computeImageToVideoCreditCost,
};
