import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildStructuredDataScript } from "./site-seo";

describe("pricing structured data", () => {
  it("publishes the current subscriptions and credit packs in EUR and USD", () => {
    const structuredData = buildStructuredDataScript(
      "https://www.luxeflexia.com",
    );

    for (const offer of [
      '"price":"9.90","priceCurrency":"EUR"',
      '"price":"24.90","priceCurrency":"EUR"',
      '"price":"49.90","priceCurrency":"EUR"',
      '"price":"9.99","priceCurrency":"USD"',
      '"price":"24.99","priceCurrency":"USD"',
      '"price":"49.99","priceCurrency":"USD"',
      '"price":"3.49","priceCurrency":"EUR"',
      '"price":"7.99","priceCurrency":"EUR"',
      '"price":"14.99","priceCurrency":"EUR"',
      '"price":"3.49","priceCurrency":"USD"',
      '"price":"7.99","priceCurrency":"USD"',
      '"price":"14.99","priceCurrency":"USD"',
      "250 crédits par mois",
      "1 200 crédits par mois",
      "2 850 crédits par mois",
    ]) {
      assert.ok(structuredData.includes(offer), `Expected offer: ${offer}`);
    }
  });
});
