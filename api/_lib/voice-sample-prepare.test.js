const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  VOICE_CLONE_AF,
  VOICE_CLONE_INLINE_AF,
  prepareVoiceSampleForCloneSource,
} = require("./voice-sample-prepare");

test("VOICE_CLONE_AF inclut highpass graves (60 Hz) et loudnorm renforcé", () => {
  assert.match(VOICE_CLONE_AF, /highpass=f=60/);
  assert.match(VOICE_CLONE_AF, /loudnorm=/);
  assert.match(VOICE_CLONE_AF, /afftdn=/);
});

test("VOICE_CLONE_INLINE_AF préserve le timbre (pas de denoise agressif)", () => {
  assert.match(VOICE_CLONE_INLINE_AF, /highpass=f=60/);
  assert.match(VOICE_CLONE_INLINE_AF, /loudnorm=/);
  assert.doesNotMatch(VOICE_CLONE_INLINE_AF, /afftdn=/);
  assert.doesNotMatch(VOICE_CLONE_INLINE_AF, /acompressor=/);
});

test("prepareVoiceSampleForCloneSource expose les modes record/import", () => {
  assert.equal(typeof prepareVoiceSampleForCloneSource, "function");
});
