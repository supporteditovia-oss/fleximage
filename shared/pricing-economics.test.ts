import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PRICING_ECONOMICS,
  USAGE_PROFILES,
  actionGrossMarginEur,
  estimatePackMonthPnl,
  minCreditsToCoverCogs,
  creditEurRate,
} from "./pricing-economics";

describe("pricing-economics", () => {
  it("Kling V2V unit costs match official 8s clips", () => {
    assert.equal(
      PRICING_ECONOMICS.unitCosts.videoV2V_8s_720p_motion_noAudio.cost,
      1.01,
    );
    assert.equal(
      PRICING_ECONOMICS.unitCosts.videoV2V_8s_720p_motion_withAudio.cost,
      1.23,
    );
  });

  it("profil createur stays within essentiel credits", () => {
    const pnl = estimatePackMonthPnl("essentiel", USAGE_PROFILES.createur);
    assert.ok(pnl.creditsUsed <= 1200);
    assert.ok(pnl.grossEur > 0);
  });

  it("V2V at 95cr covers COGS on ultimate", () => {
    const m = actionGrossMarginEur("ultimate", "videoV2V_noAudio");
    assert.ok(m.grossEur > 0);
    const minCr = minCreditsToCoverCogs(1.01, creditEurRate("ultimate"));
    assert.ok(minCr <= 95);
  });

  it("I2V at 85cr covers COGS on essentiel", () => {
    const m = actionGrossMarginEur("essentiel", "videoI2V_noAudio");
    assert.ok(m.grossEur > 0);
  });
});
