const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  inferGenderFromPrompt,
  resolveV2vVoiceMode,
  isV2vVoiceTransformMode,
  v2vVoiceModeChargesCredits,
  resolveTargetGender,
  pickVoiceReferenceId,
} = require("./v2v-voice-pool");

describe("v2v-voice-pool", () => {
  it("infers female from prompt keywords", () => {
    assert.equal(
      inferGenderFromPrompt("Transforme-moi en femme avec cette robe"),
      "female",
    );
  });

  it("infers male from celebrity-style prompt", () => {
    assert.equal(
      inferGenderFromPrompt("Remplace-moi par Cristiano Ronaldo"),
      "male",
    );
  });

  it("resolveV2vVoiceMode falls back to preserve", () => {
    assert.equal(resolveV2vVoiceMode(undefined, true), "preserve");
    assert.equal(resolveV2vVoiceMode("female", false), "female");
  });

  it("charges credits for preserve and transform modes", () => {
    assert.equal(v2vVoiceModeChargesCredits("none"), false);
    assert.equal(v2vVoiceModeChargesCredits("preserve"), true);
    assert.equal(v2vVoiceModeChargesCredits("female"), true);
    assert.equal(isV2vVoiceTransformMode("auto"), true);
  });

  it("resolveTargetGender auto uses prompt inference", () => {
    assert.equal(
      resolveTargetGender("auto", "Je veux une voix de femme", "abc"),
      "female",
    );
  });

  it("pickVoiceReferenceId returns stable id for same seed", () => {
    const a = pickVoiceReferenceId("male", "seed-1");
    const b = pickVoiceReferenceId("male", "seed-1");
    assert.equal(a, b);
    assert.match(a, /^[a-f0-9]{32}$/i);
  });
});
