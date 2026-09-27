/**
 * Coûts crédits par action — miroir de shared/credit-costs.ts
 */
const IMAGE_CREDIT_COST = 10;
const VOICE_CREDIT_COST = 10;
const VOICE_CLONE_CREDIT_COST = 30;
const VIDEO_I2V_CREDIT_COST = 85;
const VIDEO_V2V_ALEPH_CREDIT_COST = 85;
const VIDEO_V2V_KLING_SHORT_CREDIT_COST = 85;
const VIDEO_V2V_KLING_LONG_CREDIT_COST = 120;
const VIDEO_V2V_CREDIT_COST = VIDEO_V2V_KLING_LONG_CREDIT_COST;
const VIDEO_FLAT_CREDIT_COST = VIDEO_I2V_CREDIT_COST;
const VIDEO_VOICE_EXTRA_CREDIT = 5;

function ceilVideoBillableSeconds(durationSec) {
  const d = Number(durationSec);
  if (!Number.isFinite(d) || d <= 0) return 0;
  return Math.ceil(d);
}

function computeV2VCreditCost(
  sourceVideoDurationSec,
  v2vProvider,
  isAdmin = false,
) {
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

module.exports = {
  IMAGE_CREDIT_COST,
  VOICE_CREDIT_COST,
  VOICE_CLONE_CREDIT_COST,
  VIDEO_I2V_CREDIT_COST,
  VIDEO_V2V_ALEPH_CREDIT_COST,
  VIDEO_V2V_KLING_SHORT_CREDIT_COST,
  VIDEO_V2V_KLING_LONG_CREDIT_COST,
  VIDEO_V2V_CREDIT_COST,
  VIDEO_FLAT_CREDIT_COST,
  VIDEO_VOICE_EXTRA_CREDIT,
  ceilVideoBillableSeconds,
  computeV2VCreditCost,
};
