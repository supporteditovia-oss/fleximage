/** Miroir de credit-costs.ts pour l’API Node (sans transpilation TS). */
const IMAGE_CREDIT_COST = 10;
const VOICE_CREDIT_COST = 10;
const VOICE_CLONE_CREDIT_COST = 30;
const VIDEO_I2V_CREDIT_COST = 60;
const VIDEO_V2V_CREDIT_COST = 95;
const VIDEO_FLAT_CREDIT_COST = VIDEO_I2V_CREDIT_COST;
const VIDEO_VOICE_EXTRA_CREDIT = 5;

const VOICE_TTS_MAX_CHARS = 2000;
const VOICE_TTS_CHARS_PER_MINUTE = 850;

function estimateVoiceTtsBillableMinutes(text) {
  const len = Math.min(VOICE_TTS_MAX_CHARS, String(text || "").trim().length);
  if (len === 0) return 0;
  return Math.max(1, Math.ceil(len / VOICE_TTS_CHARS_PER_MINUTE));
}

function computeVoiceGenerationCreditCost(text) {
  const minutes = estimateVoiceTtsBillableMinutes(text);
  if (minutes === 0) return 0;
  return minutes * VOICE_CREDIT_COST;
}

module.exports = {
  IMAGE_CREDIT_COST,
  VOICE_CREDIT_COST,
  VOICE_CLONE_CREDIT_COST,
  VIDEO_I2V_CREDIT_COST,
  VIDEO_V2V_CREDIT_COST,
  VIDEO_FLAT_CREDIT_COST,
  VIDEO_VOICE_EXTRA_CREDIT,
  VOICE_TTS_MAX_CHARS,
  VOICE_TTS_CHARS_PER_MINUTE,
  estimateVoiceTtsBillableMinutes,
  computeVoiceGenerationCreditCost,
};
