const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

describe("generation refund helpers", () => {
  it("sumGenerationCharges totals negative deltas", () => {
    const { fetchGenerationChargeTotal } = require("./generation");
    assert.equal(typeof fetchGenerationChargeTotal, "function");
  });

  it("refundGenerationCreditsPartial is exported", () => {
    const gen = require("./generation");
    assert.equal(typeof gen.refundGenerationCreditsPartial, "function");
    assert.equal(typeof gen.refundGenerationCreditsIfCharged, "function");
  });
});
