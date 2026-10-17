const { test } = require("node:test");
const assert = require("node:assert/strict");
const { VOICE_CLONE_WARMTH_AF } = require("./voice-clone-warmth-postprocess");

test("VOICE_CLONE_WARMTH_AF inclut EQ bas-médiums et atténuation aigu", () => {
  assert.match(VOICE_CLONE_WARMTH_AF, /equalizer=f=200/);
  assert.match(VOICE_CLONE_WARMTH_AF, /2800/);
  assert.match(VOICE_CLONE_WARMTH_AF, /acompressor=/);
});
