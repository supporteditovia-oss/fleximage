const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  VOICE_CLONE_AF,
  prepareVoiceSampleForCloneSource,
} = require("./voice-sample-prepare");

test("VOICE_CLONE_AF inclut highpass graves (60 Hz) et loudnorm renforcé", () => {
  assert.match(VOICE_CLONE_AF, /highpass=f=60/);
  assert.match(VOICE_CLONE_AF, /loudnorm=/);
  assert.match(VOICE_CLONE_AF, /afftdn=/);
});

test("prepareVoiceSampleForCloneSource expose les modes record/import", () => {
  assert.equal(typeof prepareVoiceSampleForCloneSource, "function");
});
