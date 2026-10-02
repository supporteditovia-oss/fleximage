import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  VOICE_CREDIT_COST,
  VOICE_TTS_CHARS_PER_MINUTE,
  computeVoiceGenerationCreditCost,
  estimateVoiceTtsBillableMinutes,
} from "./credit-costs";

describe("voice TTS credit billing", () => {
  it("minimum 1 minute for any non-empty script", () => {
    assert.equal(estimateVoiceTtsBillableMinutes("Salut"), 1);
    assert.equal(computeVoiceGenerationCreditCost("Salut"), VOICE_CREDIT_COST);
  });

  it("scales up by minute buckets", () => {
    const short = "a".repeat(VOICE_TTS_CHARS_PER_MINUTE);
    assert.equal(estimateVoiceTtsBillableMinutes(short), 1);
    assert.equal(computeVoiceGenerationCreditCost(short), VOICE_CREDIT_COST);

    const twoMin = "a".repeat(VOICE_TTS_CHARS_PER_MINUTE + 1);
    assert.equal(estimateVoiceTtsBillableMinutes(twoMin), 2);
    assert.equal(computeVoiceGenerationCreditCost(twoMin), VOICE_CREDIT_COST * 2);
  });

  it("empty script costs 0", () => {
    assert.equal(computeVoiceGenerationCreditCost(""), 0);
    assert.equal(computeVoiceGenerationCreditCost("   "), 0);
  });
});
