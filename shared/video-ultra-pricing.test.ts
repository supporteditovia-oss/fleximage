import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeV2VStudioCreditCost,
  computeVideoUltraCreditCost,
} from "./video-ultra-pricing";

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

  it("V2V studio cost follows source duration and resolution", () => {
    assert.equal(
      computeV2VStudioCreditCost({
        sourceVideoDurationSec: 5,
        resolution: "1080p",
      }),
      80,
    );
    assert.equal(
      computeV2VStudioCreditCost({
        sourceVideoDurationSec: 5,
        resolution: "720p",
        preserveSourceAudio: true,
      }),
      65,
    );
  });
});
