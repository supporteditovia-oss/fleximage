const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  computeV2VCreditCost,
  VIDEO_I2V_CREDIT_COST,
} = require("./credit-costs");

test("I2V constant 85", () => {
  assert.equal(VIDEO_I2V_CREDIT_COST, 85);
});

test("V2V Aleph 85", () => {
  assert.equal(computeV2VCreditCost(8, "runway_aleph"), 85);
});

test("V2V Kling tiers", () => {
  assert.equal(computeV2VCreditCost(5, "kling_motion"), 85);
  assert.equal(computeV2VCreditCost(5.2, "kling_motion"), 120);
});
