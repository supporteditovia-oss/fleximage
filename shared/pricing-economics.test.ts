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
    assert.ok(pnl.creditsUsed <= 1100);
    assert.ok(pnl.grossEur > 0);
  });

  it("V2V at 60cr is below COGS on ultimate (needs quota or higher credits)", () => {
    const m = actionGrossMarginEur("ultimate", "videoV2V_noAudio");
    assert.ok(m.grossEur < 0);
    const minCr = minCreditsToCoverCogs(1.01, creditEurRate("ultimate"));
    assert.ok(minCr >= 64);
  });

  it("voice clone at 10cr loses on all subscription packs", () => {
    for (const id of ["decouverte", "essentiel", "ultimate"] as const) {
      const m = actionGrossMarginEur(id, "voiceClone");
      assert.ok(m.grossEur < 0, id);
    }
  });
});
