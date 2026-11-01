const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  listDiscoveryLegacyPriceIds,
  isLegacyDiscoveryPrice,
  KNOWN_LEGACY_DISCOVERY_EUR,
} = require("./stripe-discovery-reprice");

describe("stripe-discovery-reprice", () => {
  it("collects legacy discovery price ids from env", () => {
    const ids = listDiscoveryLegacyPriceIds({
      STRIPE_DISCOVERY_PRICE_ID: "price_new_990",
      STRIPE_DISCOVERY_LEGACY_PRICE_IDS: "price_old_a, price_old_b",
      STRIPE_WEEKLY_PRICE_ID: "price_weekly",
      STRIPE_IMAGE_LEGACY_PRICE_IDS: "price_img",
    });
    assert.ok(ids.includes(KNOWN_LEGACY_DISCOVERY_EUR));
    assert.ok(ids.includes("price_new_990"));
    assert.ok(ids.includes("price_old_a"));
    assert.ok(ids.includes("price_weekly"));
    assert.ok(ids.includes("price_img"));
  });

  it("flags 8,90 EUR monthly discovery metadata as legacy", () => {
    const legacy = new Set(["price_x"]);
    const target = "price_target_990";
    assert.equal(
      isLegacyDiscoveryPrice(
        {
          id: "price_890",
          currency: "eur",
          unit_amount: 890,
          recurring: { interval: "month" },
          metadata: { luxeflexia_plan: "discovery" },
        },
        legacy,
        target,
      ),
      true,
    );
    assert.equal(
      isLegacyDiscoveryPrice(
        {
          id: "price_target_990",
          currency: "eur",
          unit_amount: 990,
          recurring: { interval: "month" },
          metadata: { luxeflexia_plan: "discovery" },
        },
        legacy,
        target,
      ),
      false,
    );
  });
});
