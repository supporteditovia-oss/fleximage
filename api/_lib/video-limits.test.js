const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  validateSourceVideoDuration,
  computeV2VCreditCost,
  VIDEO_V2V_MAX_DURATION_SEC,
} = require("./video-limits");

describe("video-limits", () => {
  it("rejects videos longer than max duration", () => {
    const result = validateSourceVideoDuration(45, "fr");
    assert.equal(result.ok, false);
    assert.equal(result.code, "VIDEO_TOO_LONG");
  });

  it("accepts videos within limit", () => {
    const result = validateSourceVideoDuration(12, "fr");
    assert.equal(result.ok, true);
    assert.equal(result.durationSec, 12);
  });

  it("computeV2VCreditCost tiers by duration", () => {
    assert.equal(computeV2VCreditCost(6), 25);
    assert.equal(computeV2VCreditCost(10), 32);
    assert.equal(computeV2VCreditCost(15), 38);
  });

  it("max duration is 15 seconds", () => {
    assert.equal(VIDEO_V2V_MAX_DURATION_SEC, 15);
  });
});
