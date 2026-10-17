const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveVoiceGenerationMode,
  shouldApplyCloneWarmthPostprocess,
} = require("./voice-generation-modes");

test("Mode A — PLK catalogue sans clone id", () => {
  const r = resolveVoiceGenerationMode({
    fishReferenceId: "c9188f639648467f8f1c513b0dbac9f7",
  });
  assert.equal(r.mode, "A");
  assert.equal(r.isCatalogPresetVoice, true);
  assert.equal(shouldApplyCloneWarmthPostprocess(r), false);
});

test("Mode B — clone enregistré micro", () => {
  const r = resolveVoiceGenerationMode({
    voiceCloneId: "clone-1",
    fishReferenceId: "abcabcabcabcabcabcabcabcabcabc",
    sourceType: "record",
  });
  assert.equal(r.mode, "B");
  assert.equal(shouldApplyCloneWarmthPostprocess(r), true);
});
