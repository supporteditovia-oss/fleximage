import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatPlanPriceInline,
  getPlanCardPrice,
  getPaywallPlanCards,
} from "./billing";

describe("billing price display", () => {
  it("shows the configured subscription prices in EUR and USD", () => {
    assert.equal(formatPlanPriceInline("discovery", "eur"), "9,90 €");
    assert.equal(formatPlanPriceInline("essential", "eur"), "24,90 €");
    assert.equal(formatPlanPriceInline("ultimate", "eur"), "49,90 €");
    assert.equal(formatPlanPriceInline("discovery", "usd"), "$9.99");
    assert.equal(formatPlanPriceInline("essential", "usd"), "$24.99");
    assert.equal(formatPlanPriceInline("ultimate", "usd"), "$49.99");
  });

  it("keeps the paywall plan catalog aligned with currency-specific prices", () => {
    assert.deepEqual(
      getPaywallPlanCards("eur").map(({ id, price }) => [
        id,
        price.major,
        price.minor,
      ]),
      [
        ["discovery", "9", "90"],
        ["essential", "24", "90"],
        ["ultimate", "49", "90"],
      ],
    );
    assert.equal(getPlanCardPrice("essential", "usd").major, "24");
  });
});
