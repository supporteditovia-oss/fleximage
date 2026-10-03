const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  effectiveAvGapSec,
  passesAvDurationQa,
  getMaxAvGapSec,
} = require("./i2v-av-sync");

describe("i2v-av-sync", () => {
  it("effectiveAvGapSec computes absolute difference", () => {
    const gap = effectiveAvGapSec({ videoSec: 2.133, audioSec: 1.231 });
    assert.ok(Math.abs(gap - 0.902) < 0.001);
  });

  it("passesAvDurationQa respects 0.3s default threshold", () => {
    assert.equal(passesAvDurationQa(0.25), true);
    assert.equal(passesAvDurationQa(0.902), false);
    assert.equal(getMaxAvGapSec(), 0.3);
  });
});
