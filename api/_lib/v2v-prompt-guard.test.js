const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  detectVoiceIntentInPrompt,
  stripVoiceInstructionsFromPrompt,
  validateV2vVoicePromptPolicy,
} = require("./v2v-prompt-guard");

describe("v2v-prompt-guard", () => {
  it("detects voice intent in prompt", () => {
    assert.equal(
      detectVoiceIntentInPrompt(
        "Remplace-moi par une meuf super belle avec une voix bien mielleuse",
      ),
      true,
    );
    assert.equal(
      detectVoiceIntentInPrompt("Remplace-moi par une femme super belle"),
      false,
    );
  });

  it("blocks voice intent when mode is none", () => {
    const result = validateV2vVoicePromptPolicy({
      swapPrompt: "Remplace-moi par une meuf avec une voix douce",
      v2vVoiceMode: "none",
      uiLocale: "fr",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "V2V_VOICE_OPTION_REQUIRED");
  });

  it("blocks voice intent when mode is preserve", () => {
    const result = validateV2vVoicePromptPolicy({
      swapPrompt: "Swap avec une voix grave",
      v2vVoiceMode: "preserve",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "V2V_VOICE_TRANSFORM_REQUIRED");
  });

  it("strips voice clauses for transform mode and keeps visual", () => {
    const result = validateV2vVoicePromptPolicy({
      swapPrompt:
        "Remplace-moi par une femme super belle, avec une voix bien mielleuse. Garde le décor identique.",
      v2vVoiceMode: "female",
    });
    assert.equal(result.ok, true);
    assert.match(result.visualPrompt, /femme super belle/i);
    assert.doesNotMatch(result.visualPrompt, /voix/i);
  });

  it("stripVoiceInstructionsFromPrompt removes voice segments", () => {
    const stripped = stripVoiceInstructionsFromPrompt(
      "Remplace-moi par une meuf, avec une voix mielleuse",
    );
    assert.match(stripped, /meuf/i);
    assert.doesNotMatch(stripped, /voix/i);
  });
});
