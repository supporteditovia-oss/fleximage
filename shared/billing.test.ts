import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatCreditPackPriceInline,
  formatPlanPriceInline,
  getCreditPackCards,
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
      getPaywallPlanCards("eur").map(({ id, price, credits }) => [
        id,
        price.major,
        price.minor,
        credits,
      ]),
      [
        ["discovery", "9", "90", 250],
        ["essential", "24", "90", 1200],
        ["ultimate", "49", "90", 2850],
      ],
    );
    assert.equal(getPlanCardPrice("essential", "usd").major, "24");
  });

  it("shows the configured one-time credit packs in EUR and USD", () => {
    assert.deepEqual(
      getCreditPackCards("eur").map(({ id, credits }) => [id, credits]),
      [
        ["mini", 90],
        ["standard", 210],
        ["plus", 450],
      ],
    );
    assert.equal(formatCreditPackPriceInline("mini", "eur"), "3,49 €");
    assert.equal(formatCreditPackPriceInline("standard", "eur"), "7,99 €");
    assert.equal(formatCreditPackPriceInline("plus", "eur"), "14,99 €");
    assert.equal(formatCreditPackPriceInline("mini", "usd"), "$3.49");
    assert.equal(formatCreditPackPriceInline("standard", "usd"), "$7.99");
    assert.equal(formatCreditPackPriceInline("plus", "usd"), "$14.99");
  });
});
