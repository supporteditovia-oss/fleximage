import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTrustStatsDisplay,
  floorTrustCount,
  TRUST_STATS_MIN_TOTAL,
} from "./trust-stats";

describe("floorTrustCount", () => {
  it("floors large counts to thousands", () => {
    assert.equal(floorTrustCount(12_456), 12_000);
    assert.equal(floorTrustCount(12_999), 12_000);
  });

  it("floors mid counts to hundreds", () => {
    assert.equal(floorTrustCount(892), 850);
    assert.equal(floorTrustCount(1_234), 1_000);
  });

  it("never inflates", () => {
    assert.ok(floorTrustCount(12_456) <= 12_456);
    assert.ok(floorTrustCount(499) <= 499);
  });
});

describe("buildTrustStatsDisplay", () => {
  it("shows total only above threshold", () => {
    const below = buildTrustStatsDisplay({
      totalGenerations: TRUST_STATS_MIN_TOTAL - 1,
      recentGenerations: 0,
      creators: 0,
    });
    assert.equal(below.showTotal, false);

    const above = buildTrustStatsDisplay({
      totalGenerations: 12_456,
      recentGenerations: 800,
      creators: 420,
    });
    assert.equal(above.showTotal, true);
    assert.equal(above.totalGenerations, 12_000);
    assert.equal(above.showCreators, true);
    assert.equal(above.creators, 400);
  });
});
