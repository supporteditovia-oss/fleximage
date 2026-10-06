const test = require("node:test");
const assert = require("node:assert/strict");
const { computePollRemainingSeconds } = require("./generation-display-timing");

test("linéaire : moitié du temps → moitié du compte à rebours", () => {
  const E = 60;
  const mid = computePollRemainingSeconds(E, 30, "generating");
  assert.equal(mid, 30);
});

test("linéaire : dernière seconde avant estimate → 1 s", () => {
  const E = 60;
  assert.equal(computePollRemainingSeconds(E, 59, "generating"), 1);
});

test("overtime : juste après estimate, petite marge affichée", () => {
  const E = 60;
  assert.equal(computePollRemainingSeconds(E, 60, "generating"), 14);
});

test("overtime : décroît après dépassement", () => {
  const E = 60;
  const a = computePollRemainingSeconds(E, 70, "generating");
  const b = computePollRemainingSeconds(E, 100, "generating");
  assert.ok(a > b);
});

test("done → 0", () => {
  assert.equal(computePollRemainingSeconds(300, 999, "done"), 0);
});
