const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  computeI2VProrataRefund,
  resolveI2VDeliverDurationSec,
} = require("./i2v-delivered-billing");

describe("i2v-delivered-billing", () => {
  it("(a) short phrase target 5s — no refund when delivered meets request", () => {
    const r = computeI2VProrataRefund(65, 5, 5);
    assert.equal(r.refundAmount, 0);
  });

  it("(a) kie delivered 2s of 5s quoted — prorata refund", () => {
    const r = computeI2VProrataRefund(65, 5, 2);
    assert.equal(r.fairCost, 26);
    assert.equal(r.refundAmount, 39);
  });

  it("(b) long phrase delivered 6.2s on 5s request — no auto-refund", () => {
    const r = computeI2VProrataRefund(65, 5, 6.2);
    assert.equal(r.refundAmount, 0);
  });

  it("resolveI2VDeliverDurationSec uses max(requested, streams)", () => {
    assert.equal(
      resolveI2VDeliverDurationSec(3, { videoSec: 3.0, audioSec: 3.0 }),
      3,
    );
    assert.equal(
      resolveI2VDeliverDurationSec(5, { videoSec: 2.1, audioSec: 2.0 }),
      5,
    );
    assert.equal(
      resolveI2VDeliverDurationSec(5, { videoSec: 5.0, audioSec: 6.3 }),
      6.3,
    );
  });
});
