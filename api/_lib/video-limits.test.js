const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  validateSourceVideoDuration,
  computeV2VCreditCost,
  VIDEO_V2V_MAX_DURATION_SEC,
  VIDEO_V2V_CREDIT_COST,
} = require("./video-limits");

describe("video-limits", () => {
  it("rejects videos longer than max duration", () => {
    const result = validateSourceVideoDuration(45, "fr");
    assert.equal(result.ok, false);
    assert.equal(result.code, "VIDEO_TOO_LONG");
  });

  it("accepts 4s and 9s clips (3–10s validation window)", () => {
    assert.equal(validateSourceVideoDuration(4, "fr").ok, true);
    assert.equal(validateSourceVideoDuration(9, "fr").ok, true);
  });

  it("infers duration when metadata missing", () => {
    const result = validateSourceVideoDuration(undefined, "fr");
    assert.equal(result.ok, true);
    assert.equal(result.durationSec, 5);
    assert.equal(result.durationInferred, true);
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

  it("rejects videos clearly over 10s even with slack", () => {
    const result = validateSourceVideoDuration(10.6, "fr");
    assert.equal(result.ok, false);
    assert.equal(result.code, "VIDEO_TOO_LONG");
  });

  it("computeV2VCreditCost is flat regardless of duration", () => {
    assert.equal(computeV2VCreditCost(3), VIDEO_V2V_CREDIT_COST);
    assert.equal(computeV2VCreditCost(8), VIDEO_V2V_CREDIT_COST);
  });

  it("max duration is 8 seconds", () => {
    assert.equal(VIDEO_V2V_MAX_DURATION_SEC, 8);
  });
});
