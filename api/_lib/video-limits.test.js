const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  validateSourceVideoDuration,
  computeV2VCreditCost,
  VIDEO_V2V_MAX_DURATION_SEC,
  VIDEO_FLAT_CREDIT_COST,
} = require("./video-limits");

describe("video-limits", () => {
  it("rejects videos longer than max duration", () => {
    const result = validateSourceVideoDuration(45, "fr");
    assert.equal(result.ok, false);
    assert.equal(result.code, "VIDEO_TOO_LONG");
  });

  it("rejects videos over 5 seconds", () => {
    const result = validateSourceVideoDuration(6, "fr");
    assert.equal(result.ok, false);
    assert.equal(result.code, "VIDEO_TOO_LONG");
  });

  it("accepts videos within limit", () => {
    const result = validateSourceVideoDuration(5, "fr");
    assert.equal(result.ok, true);
    assert.equal(result.durationSec, 5);
  });

  it("accepts 5s smartphone metadata slack (5.03–5.15s)", () => {
    assert.equal(validateSourceVideoDuration(5.033, "fr").ok, true);
    assert.equal(validateSourceVideoDuration(5.15, "fr").ok, true);
    assert.equal(validateSourceVideoDuration(5.5, "fr").ok, true);
  });

  it("rejects videos clearly over 5s even with slack", () => {
    const result = validateSourceVideoDuration(5.51, "fr");
    assert.equal(result.ok, false);
    assert.equal(result.code, "VIDEO_TOO_LONG");
  });

  it("computeV2VCreditCost is flat regardless of duration", () => {
    assert.equal(computeV2VCreditCost(3), VIDEO_FLAT_CREDIT_COST);
    assert.equal(computeV2VCreditCost(5), VIDEO_FLAT_CREDIT_COST);
  });

  it("max duration is 5 seconds", () => {
    assert.equal(VIDEO_V2V_MAX_DURATION_SEC, 5);
  });
});
