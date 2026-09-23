import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PRICING_CATALOG_V2,
  essentialEurPerCredit,
  packEurPerCredit,
  packUsageHints,
} from "./pricing-catalog-v2";

describe("pricing-catalog-v2", () => {
  it("packs stay pricier per credit than Essentiel", () => {
    const floor = essentialEurPerCredit();
    for (const pack of PRICING_CATALOG_V2.creditPacks.eur) {
      const rate = packEurPerCredit(pack.amountCents, pack.credits);
      assert.ok(
        rate > floor * 1.35,
        `${pack.id} should stay above subscription €/cr`,
      );
    }
  });

  it("exactly three universal credit packs in EUR", () => {
    assert.equal(PRICING_CATALOG_V2.creditPacks.eur.length, 3);
    const ids = PRICING_CATALOG_V2.creditPacks.eur.map((p) => p.id);
    assert.deepEqual(ids, ["mini", "standard", "plus"]);
    const plus = PRICING_CATALOG_V2.creditPacks.eur.find((p) => p.id === "plus");
    assert.ok(plus);
    const hints = packUsageHints(plus!.credits);
    assert.ok(hints.videoI2v >= 1);
  });

  it("subscription credits match validated grid", () => {
    const byId = Object.fromEntries(
      PRICING_CATALOG_V2.subscriptions.map((s) => [s.id, s]),
    );
    assert.equal(byId.discovery.creditsPerMonth, 250);
    assert.equal(byId.discovery.priceTtcCents, 990);
    assert.equal(byId.essential.creditsPerMonth, 1200);
    assert.equal(byId.essential.priceTtcCents, 2490);
    assert.equal(byId.ultimate.creditsPerMonth, 2850);
    assert.equal(byId.ultimate.priceTtcCents, 4990);
  });
});
