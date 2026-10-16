const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  VOICE_CLONE_MIN_SAMPLE_SEC,
  isVoiceCloneSampleLongEnough,
  formatVoiceCloneSampleTooShortMessage,
} = require("./voice-clone-limits");

describe("voice-clone-limits", () => {
  it("accepts 18s sample (consigne 15–20 s)", () => {
    assert.equal(isVoiceCloneSampleLongEnough(18), true);
    assert.equal(isVoiceCloneSampleLongEnough(18.5), true);
  });

  it("rejects 12s with message aligned on 15s minimum (not 30)", () => {
    assert.equal(isVoiceCloneSampleLongEnough(12), false);
    const msg = formatVoiceCloneSampleTooShortMessage(12, { source: "record" });
    assert.match(msg, /Enregistrement trop court \(12 s\)/);
    assert.match(msg, new RegExp(`minimum ${VOICE_CLONE_MIN_SAMPLE_SEC} s`));
    assert.doesNotMatch(msg, /minimum 30 s/);
  });
});
