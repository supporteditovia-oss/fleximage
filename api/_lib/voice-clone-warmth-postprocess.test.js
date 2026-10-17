const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  VOICE_CLONE_WARMTH_AF,
  VOICE_CLONE_WARMTH_DEEP_AF,
  VOICE_CLONE_WARMTH_IDENTITY_AF,
} = require("./voice-clone-warmth-postprocess");

test("VOICE_CLONE_WARMTH_AF inclut EQ bas-médiums et atténuation aigu", () => {
  assert.match(VOICE_CLONE_WARMTH_AF, /equalizer=f=200/);
  assert.match(VOICE_CLONE_WARMTH_AF, /2800/);
  assert.match(VOICE_CLONE_WARMTH_AF, /acompressor=/);
});

test("VOICE_CLONE_WARMTH_DEEP_AF — coffre 150–200 Hz", () => {
  assert.match(VOICE_CLONE_WARMTH_DEEP_AF, /equalizer=f=150/);
  assert.match(VOICE_CLONE_WARMTH_DEEP_AF, /equalizer=f=200/);
});

test("VOICE_CLONE_WARMTH_IDENTITY_AF — correction légère sans gros boost bas", () => {
  assert.match(VOICE_CLONE_WARMTH_IDENTITY_AF, /2800/);
  assert.doesNotMatch(VOICE_CLONE_WARMTH_IDENTITY_AF, /equalizer=f=200/);
});
