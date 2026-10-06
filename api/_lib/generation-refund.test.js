const { test } = require("node:test");
const assert = require("node:assert/strict");
const { reconcileFailMessageWithRefund } = require("./generation");

test("reconcileFailMessageWithRefund — confirms refund when ok", () => {
  const out = reconcileFailMessageWithRefund("Échec studio.", {
    ok: true,
    hadCharge: true,
    refundedAmount: 42,
  });
  assert.match(out, /Jetons remboursés/);
});

test("reconcileFailMessageWithRefund — does not claim refund when charge failed", () => {
  const out = reconcileFailMessageWithRefund(
    "Le studio n’a pas pu animer ce clip. Jetons remboursés.",
    { ok: false, hadCharge: true, refundedAmount: 0 },
  );
  assert.doesNotMatch(out, /Jetons remboursés\.?\s*$/);
  assert.match(out, /support\.luxeflexia@gmail.com/i);
});

test("reconcileFailMessageWithRefund — no charge unchanged", () => {
  const msg = "Timeout.";
  assert.equal(
    reconcileFailMessageWithRefund(msg, {
      ok: true,
      hadCharge: false,
      refundedAmount: 0,
    }),
    msg,
  );
});
