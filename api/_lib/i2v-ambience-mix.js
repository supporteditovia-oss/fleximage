/**
 * @deprecated Préférer i2v-audio-mix.js (ambiance + SFX).
 */
const {
  normalizeI2VAmbience,
  VALID_AMBIENCE,
} = require("../../shared/i2v-ambience.cjs");
const { mixI2VAmbienceOnMp4Buffer } = require("./i2v-audio-mix");

module.exports = {
  normalizeI2VAmbience,
  mixI2VAmbienceOnMp4Buffer,
  VALID_AMBIENCE,
};
