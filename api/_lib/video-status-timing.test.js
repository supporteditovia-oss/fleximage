const test = require("node:test");
const assert = require("node:assert/strict");
const { computeVideoPollRemainingSeconds } = require("./video-status-timing");

test("courbe : plus de temps affiché qu'en linéaire au milieu", () => {
  const E = 300;
  const mid = computeVideoPollRemainingSeconds(E, 150, "generating");
  assert.ok(mid > 150);
  assert.ok(mid < 300);
});

test("ne tombe pas à 0 tant que elapsed < E (courbe)", () => {
  const E = 300;
  const nearEnd = computeVideoPollRemainingSeconds(E, 299, "generating");
  assert.ok(nearEnd >= 1);
});

test("overtime : reste > 0 après dépassement de l'estimation", () => {
  const E = 300;
  const ot = computeVideoPollRemainingSeconds(E, 320, "generating");
  assert.ok(ot >= 5);
  assert.ok(ot <= 48);
});

test("overtime décroît avec le temps", () => {
  const E = 300;
  const a = computeVideoPollRemainingSeconds(E, 400, "generating");
  const b = computeVideoPollRemainingSeconds(E, 500, "generating");
  assert.ok(b < a);
});

test("done → 0", () => {
  assert.equal(computeVideoPollRemainingSeconds(300, 999, "done"), 0);
});
