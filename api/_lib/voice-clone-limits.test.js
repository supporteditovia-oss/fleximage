const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  VOICE_CLONE_MIN_SAMPLE_SEC,
  isVoiceCloneSampleLongEnough,
  formatVoiceCloneSampleTooShortMessage,
  resolveVoiceCloneMinSampleSec,
  resolveEffectiveVoiceCloneSampleSec,
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

  it("sanitizes minSec=30 (jetons crédits) → 15 s", () => {
    assert.equal(resolveVoiceCloneMinSampleSec(30), 15);
    const msg = formatVoiceCloneSampleTooShortMessage(18, {
      source: "record",
      minSec: 30,
    });
    assert.match(msg, /minimum 15 s/);
    assert.doesNotMatch(msg, /minimum 30 s/);
  });

  it("resolveEffective prefers client chrono when WAV measure is too low", () => {
    assert.equal(resolveEffectiveVoiceCloneSampleSec(8, 18.5), 18.5);
    assert.equal(resolveEffectiveVoiceCloneSampleSec(18, 18.5), 18.5);
  });
});
