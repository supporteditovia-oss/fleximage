import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeVideoUltraCreditCost } from "./video-ultra-pricing";

describe("video-ultra-pricing", () => {
  it("matches credit grid", () => {
    assert.equal(
      computeVideoUltraCreditCost({ durationSec: 5, resolution: "720p" }),
      60,
    );
    assert.equal(
      computeVideoUltraCreditCost({ durationSec: 5, resolution: "1080p" }),
      80,
    );
    assert.equal(
      computeVideoUltraCreditCost({ durationSec: 5, resolution: "4k" }),
      200,
    );
    assert.equal(
      computeVideoUltraCreditCost({ durationSec: 8, resolution: "4k" }),
      320,
    );
  });
});
