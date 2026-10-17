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

test("catalog Fish id prioritaire sur voiceCloneId résiduel (Niska)", () => {
  const mode = resolveVoiceGenerationMode({
    voiceCloneId: "stale-clone-uuid",
    fishReferenceId: "6be490a175744894826dd464cf3a5004",
  });
  assert.equal(mode.mode, "A");
  assert.equal(mode.isCatalogPresetVoice, true);
  assert.equal(mode.catalogEntry?.slug, "niska");
});
