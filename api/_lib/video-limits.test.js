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

  it("rejects videos over 8 seconds", () => {
    const result = validateSourceVideoDuration(9, "fr");
    assert.equal(result.ok, false);
    assert.equal(result.code, "VIDEO_TOO_LONG");
  });

  it("accepts videos within limit", () => {
    const result = validateSourceVideoDuration(8, "fr");
    assert.equal(result.ok, true);
    assert.equal(result.durationSec, 8);
  });

  it("accepts 8s smartphone metadata slack (8.03–8.15s)", () => {
    assert.equal(validateSourceVideoDuration(8.033, "fr").ok, true);
    assert.equal(validateSourceVideoDuration(8.15, "fr").ok, true);
    assert.equal(validateSourceVideoDuration(8.5, "fr").ok, true);
  });

  it("rejects videos clearly over 8s even with slack", () => {
    const result = validateSourceVideoDuration(8.51, "fr");
    assert.equal(result.ok, false);
    assert.equal(result.code, "VIDEO_TOO_LONG");
  });

  it("computeV2VCreditCost is flat regardless of duration", () => {
    assert.equal(computeV2VCreditCost(3), VIDEO_FLAT_CREDIT_COST);
    assert.equal(computeV2VCreditCost(8), VIDEO_FLAT_CREDIT_COST);
  });

  it("max duration is 8 seconds", () => {
    assert.equal(VIDEO_V2V_MAX_DURATION_SEC, 8);
  });
});
