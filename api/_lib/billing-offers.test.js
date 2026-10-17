const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  PLAN_CREDITS,
  PLAN_PRICES_EUR,
  PLAN_PRICES_USD,
  CREDIT_PACKS_EUR,
  CREDIT_PACKS_USD,
  getPackById,
  getUpgradeOffers,
  resolvePlanPriceId,
  resolvePackEnvKey,
} = require("./billing-offers");

describe("billing offer catalog", () => {
  it("defines the exact subscription credits and prices in both currencies", () => {
    assert.deepEqual(PLAN_CREDITS, {
      discovery: 250,
      essential: 1200,
      ultimate: 2850,
    });
    assert.deepEqual(PLAN_PRICES_EUR, {
      discovery: "9,90",
      essential: "24,90",
      ultimate: "49,90",
    });
    assert.deepEqual(PLAN_PRICES_USD, {
      discovery: "9.99",
      essential: "24.99",
      ultimate: "49.99",
    });
  });

  it("defines the exact one-time boost amounts in both currencies", () => {
    const expected = [
      { id: "mini", credits: 90, amountCents: 349, images: 9 },
      { id: "standard", credits: 210, amountCents: 799, images: 21 },
      { id: "plus", credits: 450, amountCents: 1499, images: 45 },
    ];
    for (const [index, pack] of CREDIT_PACKS_EUR.entries()) {
      assert.deepEqual(
        {
          id: pack.id,
          credits: pack.credits,
          amountCents: pack.amountCents,
          images: pack.images,
        },
        expected[index],
      );
    }
    for (const [index, pack] of CREDIT_PACKS_USD.entries()) {
      assert.deepEqual(
        {
          id: pack.id,
          credits: pack.credits,
          amountCents: pack.amountCents,
          images: pack.images,
        },
        expected[index],
      );
    }
  });

  it("uses the configured currency-specific Stripe Price IDs", () => {
    const keys = [
      ["STRIPE_ESSENTIAL_PRICE_ID", "price_eur"],
      ["STRIPE_ESSENTIAL_PRICE_ID_USD", "price_usd"],
      ["STRIPE_PACK_PLUS_PRICE_ID", "price_pack_eur"],
      ["STRIPE_PACK_PLUS_PRICE_ID_USD", "price_pack_usd"],
    ];
    const previous = new Map(keys.map(([key]) => [key, process.env[key]]));
    try {
      for (const [key, value] of keys) process.env[key] = value;
      assert.equal(resolvePlanPriceId("essential", "eur"), "price_eur");
      assert.equal(resolvePlanPriceId("essential", "usd"), "price_usd");
      assert.equal(
        resolvePackEnvKey(getPackById("plus", "eur"), "eur"),
        "STRIPE_PACK_PLUS_PRICE_ID",
      );
      assert.equal(
        resolvePackEnvKey(getPackById("plus", "usd"), "usd"),
        "STRIPE_PACK_PLUS_PRICE_ID_USD",
      );
    } finally {
      for (const [key, value] of previous) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it("keeps upgrade copy synchronized with plan credits and prices", () => {
    const eur = getUpgradeOffers("discovery", "eur");
    const usd = getUpgradeOffers("discovery", "usd");
    assert.equal(eur[0].credits, 1200);
    assert.equal(eur[0].priceLabel, "24,90");
    assert.equal(usd[0].credits, 1200);
    assert.equal(usd[0].priceLabel, "24.99");
    assert.equal(eur[1].credits, 2850);
    assert.equal(eur[1].priceLabel, "49,90");
    assert.equal(usd[1].credits, 2850);
    assert.equal(usd[1].priceLabel, "49.99");
  });
});
