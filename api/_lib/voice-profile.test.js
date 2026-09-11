const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  inferVoiceLineFromPrompt,
  heuristicVoiceProfile,
} = require("./voice-profile");

describe("voice-profile", () => {
  it("infers Ah! from fall prompt", () => {
    assert.equal(
      inferVoiceLineFromPrompt("Je veux qu'il tombe dans l'eau", ""),
      "Ah !",
    );
  });

  it("uses user line when provided", () => {
    assert.equal(inferVoiceLineFromPrompt("tombe", "Aaaah !"), "Aaaah !");
  });

  it("heuristic detects child from prompt", () => {
    const profile = heuristicVoiceProfile("Un enfant court dans le parc");
    assert.equal(profile.age_band, "child");
    assert.equal(profile.voice_category, "child");
  });
});
