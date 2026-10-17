const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  VOICE_CLONE_AF,
  VOICE_CLONE_INLINE_AF,
  VOICE_CLONE_INLINE_PUNCH_AF,
  prepareVoiceSampleForCloneSource,
} = require("./voice-sample-prepare");

test("VOICE_CLONE_AF inclut highpass graves (50 Hz) et loudnorm renforcé", () => {
  assert.match(VOICE_CLONE_AF, /highpass=f=50/);
  assert.match(VOICE_CLONE_AF, /loudnorm=/);
  assert.match(VOICE_CLONE_AF, /afftdn=/);
});

test("VOICE_CLONE_INLINE_AF préserve le timbre (pas de denoise agressif)", () => {
  assert.match(VOICE_CLONE_INLINE_AF, /highpass=f=50/);
  assert.match(VOICE_CLONE_INLINE_AF, /loudnorm=.*LRA=16/);
  assert.doesNotMatch(VOICE_CLONE_INLINE_AF, /afftdn=/);
  assert.doesNotMatch(VOICE_CLONE_INLINE_AF, /acompressor=/);
});

test("VOICE_CLONE_INLINE_PUNCH_AF — pas de loudnorm", () => {
  assert.match(VOICE_CLONE_INLINE_PUNCH_AF, /acompressor=/);
  assert.doesNotMatch(VOICE_CLONE_INLINE_PUNCH_AF, /loudnorm=/);
});

test("prepareVoiceSampleForCloneSource expose les modes record/import", () => {
  assert.equal(typeof prepareVoiceSampleForCloneSource, "function");
});
