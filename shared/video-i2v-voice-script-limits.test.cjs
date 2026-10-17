const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  maxVoiceCharsForI2VDuration,
  validateI2VVoiceScript,
} = require("./video-i2v-voice-script-limits.cjs");

test("limites caractères 3s / 5s", () => {
  assert.equal(maxVoiceCharsForI2VDuration(3), 120);
  assert.equal(maxVoiceCharsForI2VDuration(5), 220);
});

test("validateI2VVoiceScript refuse texte trop long", () => {
  const long = "x".repeat(221);
  const result = validateI2VVoiceScript(long, 5);
  assert.equal(result.ok, false);
  assert.match(result.reason, /220/);
});
