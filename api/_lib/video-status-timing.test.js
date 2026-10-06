const test = require("node:test");
const assert = require("node:assert/strict");
const { computePollRemainingSeconds } = require("./video-status-timing");

test("linéaire : temps restant = estimate − elapsed", () => {
  const E = 100;
  assert.equal(computePollRemainingSeconds(E, 40, "generating"), 60);
});

test("ne reste pas artificiellement haut à mi-parcours", () => {
  const E = 300;
  const mid = computePollRemainingSeconds(E, 150, "generating");
  assert.equal(mid, 150);
});

test("overtime finit par 0", () => {
  const E = 60;
  const late = computePollRemainingSeconds(E, 200, "generating");
  assert.equal(late, 0);
});
