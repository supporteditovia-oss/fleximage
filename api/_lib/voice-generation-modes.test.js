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
  assert.equal(
    shouldApplyCloneWarmthPostprocess({
      isCatalogPresetVoice: true,
      generationMode: "A",
    }),
    false,
  );
});

test("Mode B — clone enregistré micro sans warmth destructif", () => {
  const r = resolveVoiceGenerationMode({
    voiceCloneId: "clone-1",
    fishReferenceId: "abcabcabcabcabcabcabcabcabcabc",
    sourceType: "record",
  });
  assert.equal(r.mode, "B");
  assert.equal(
    shouldApplyCloneWarmthPostprocess({
      isCatalogPresetVoice: false,
      generationMode: "B",
    }),
    false,
  );
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

test("Mode C incisif — pas de warmth post-TTS", () => {
  assert.equal(
    shouldApplyCloneWarmthPostprocess({
      generationMode: "C",
      incisiveClone: true,
    }),
    false,
  );
});

test("Mode C deep chest — warmth autorisé", () => {
  assert.equal(
    shouldApplyCloneWarmthPostprocess({
      generationMode: "C",
      deepChestClone: true,
    }),
    true,
  );
});
