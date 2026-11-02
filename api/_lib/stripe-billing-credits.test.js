const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  creditsPerCycleForPlan,
  PLAN_CREDITS,
} = require("./stripe-billing");

describe("creditsPerCycleForPlan", () => {
  it("Discovery is always 250 credits (8,90 € and 9,90 €)", () => {
    assert.equal(creditsPerCycleForPlan("discovery"), 250);
    assert.equal(creditsPerCycleForPlan("weekly"), 250);
    assert.equal(creditsPerCycleForPlan("image"), 250);
    assert.equal(PLAN_CREDITS.discovery, 250);
  });

  it("Essential and Ultimate use canonical quotas", () => {
    assert.equal(creditsPerCycleForPlan("essential"), 1200);
    assert.equal(creditsPerCycleForPlan("monthly"), 1200);
    assert.equal(creditsPerCycleForPlan("ultimate"), 2850);
  });
});
