import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PRICING_CATALOG_V2 } from "./pricing-catalog-v2";
import { estimateOneShotWorstCasePnl } from "./credit-burn-pnl";

/** Marge nette poche minimale exigée sur un pack (€). */
const MIN_PACK_NET_POCKET_EUR = 0.85;

describe("credit-burn-pnl", () => {
  it("packs v2 restent positifs même si 100 % crédits → clones / V2V", () => {
    for (const pack of PRICING_CATALOG_V2.creditPacks.eur) {
      const pnl = estimateOneShotWorstCasePnl(pack.amountCents, pack.credits);
      assert.ok(
        pnl.netPocketEur >= MIN_PACK_NET_POCKET_EUR,
        `${pack.id}: net poche ${pnl.netPocketEur.toFixed(2)} € (COGS pire ${pnl.cogsWorstEur.toFixed(2)} €)`,
      );
      assert.ok(
        pnl.grossBeforeFixedChargesEur > 0,
        `${pack.id}: brut avant charges fixes doit rester > 0`,
      );
    }
  });

  it("abonnements v2 : brûlage intégral des crédits mensuels ne va pas en négatif net poche", () => {
    for (const sub of PRICING_CATALOG_V2.subscriptions) {
      const pnl = estimateOneShotWorstCasePnl(
        sub.priceTtcCents,
        sub.creditsPerMonth,
      );
      assert.ok(
        pnl.netPocketEur > 0,
        `${sub.id}: net poche ${pnl.netPocketEur.toFixed(2)} € sur ${sub.creditsPerMonth} cr`,
      );
    }
  });
});
