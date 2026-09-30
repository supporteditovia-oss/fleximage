import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeImageToVideoCreditCost,
  estimateRunwayI2VApiCostUsd,
  minProfitableI2VCredits,
  RUNWAY_KIE_1080P_COST_FACTOR,
} from "./video-i2v-pricing";
import {
  creditEurRate,
  minCreditsToCoverCogs,
  PRICING_ECONOMICS,
} from "./pricing-economics";

describe("video-i2v-pricing — zero perte COGS", () => {
  const combos = [
    { durationSec: 3, quality: "standard" as const },
    { durationSec: 5, quality: "standard" as const },
    { durationSec: 3, quality: "high" as const },
    { durationSec: 5, quality: "high" as const },
  ];

  for (const combo of combos) {
    it(`prod ${combo.durationSec}s ${combo.quality} ≥ plancher COGS`, () => {
      const billed = computeImageToVideoCreditCost({
        ...combo,
        billingGrid: "prod",
      });
      const floor = minProfitableI2VCredits(combo);
      assert.ok(billed >= floor, `${billed} < floor ${floor}`);
    });
  }

  it("1080p coûte nettement plus que 720p (ratio Kie ~37/17)", () => {
    const p720 = computeImageToVideoCreditCost({
      durationSec: 5,
      quality: "standard",
      billingGrid: "prod",
    });
    const p1080 = computeImageToVideoCreditCost({
      durationSec: 5,
      quality: "high",
      billingGrid: "prod",
    });
    assert.ok(p1080 > p720 * 1.9);
    assert.ok(
      estimateRunwayI2VApiCostUsd({ durationSec: 5, quality: "high" }) >
        estimateRunwayI2VApiCostUsd({ durationSec: 5, quality: "standard" }) *
          (RUNWAY_KIE_1080P_COST_FACTOR - 0.05),
    );
  });

  it("3s reste rentable même si API facture 5s (COGS = clip 5s)", () => {
    const cogs = PRICING_ECONOMICS.unitCosts.videoI2V_5s_720p_noAudio.cost;
    const credits = computeImageToVideoCreditCost({
      durationSec: 3,
      quality: "standard",
      billingGrid: "prod",
    });
    const minUltimate = minCreditsToCoverCogs(cogs, creditEurRate("ultimate"));
    assert.ok(credits >= minUltimate);
  });

  it("5s 1080p prod couvre COGS sur pack Ultimate", () => {
    const cogs = estimateRunwayI2VApiCostUsd({
      durationSec: 5,
      quality: "high",
    });
    const credits = computeImageToVideoCreditCost({
      durationSec: 5,
      quality: "high",
      billingGrid: "prod",
    });
    const revenue = credits * creditEurRate("ultimate");
    assert.ok(revenue > cogs * 1.2);
  });
});
