const { normalizeI2VDurationSec } = require("./video-i2v-pricing.cjs");

const I2V_VOICE_SCRIPT_MAX_CHARS_3S = 120;
const I2V_VOICE_SCRIPT_MAX_CHARS_5S = 220;
const I2V_VOICE_SCRIPT_MAX_WORDS_3S = 24;
const I2V_VOICE_SCRIPT_MAX_WORDS_5S = 40;

function maxVoiceCharsForI2VDuration(rawDurationSec) {
  const d = normalizeI2VDurationSec(rawDurationSec);
  return d === 3 ? I2V_VOICE_SCRIPT_MAX_CHARS_3S : I2V_VOICE_SCRIPT_MAX_CHARS_5S;
}

function maxVoiceWordsForI2VDuration(rawDurationSec) {
  const d = normalizeI2VDurationSec(rawDurationSec);
  return d === 3 ? I2V_VOICE_SCRIPT_MAX_WORDS_3S : I2V_VOICE_SCRIPT_MAX_WORDS_5S;
}

function countSpeakableWords(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function validateI2VVoiceScript(text, rawDurationSec) {
  const durationSec = normalizeI2VDurationSec(rawDurationSec);
  const maxChars = maxVoiceCharsForI2VDuration(durationSec);
  const maxWords = maxVoiceWordsForI2VDuration(durationSec);
  const len = String(text || "").trim().length;
  if (len === 0) {
    return { ok: false, reason: "Texte vocal requis.", max: maxChars, maxWords };
  }
  if (len > maxChars) {
    return {
      ok: false,
      reason: `Texte trop long pour ${durationSec}s (max ${maxChars} caractères).`,
      max: maxChars,
      maxWords,
    };
  }
  const words = countSpeakableWords(text);
  if (words > maxWords) {
    return {
      ok: false,
      reason: `Texte trop dense pour ${durationSec}s (max ~${maxWords} mots).`,
      max: maxChars,
      maxWords,
    };
  }
  return { ok: true, max: maxChars, maxWords };
}

module.exports = {
  I2V_VOICE_SCRIPT_MAX_CHARS_3S,
  I2V_VOICE_SCRIPT_MAX_CHARS_5S,
  I2V_VOICE_SCRIPT_MAX_WORDS_3S,
  I2V_VOICE_SCRIPT_MAX_WORDS_5S,
  maxVoiceCharsForI2VDuration,
  maxVoiceWordsForI2VDuration,
  countSpeakableWords,
  validateI2VVoiceScript,
};
