import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeV2VStudioCreditCost,
  computeVideoUltraCreditCost,
  v2vResolutionsForEngineFamily,
} from "./video-ultra-pricing";

describe("video-ultra-pricing", () => {
  it("matches credit grid", () => {
    assert.equal(
      computeVideoUltraCreditCost({ durationSec: 3, resolution: "720p" }),
      85,
    );
    assert.equal(
      computeVideoUltraCreditCost({ durationSec: 5, resolution: "720p" }),
      85,
    );
    assert.equal(
      computeVideoUltraCreditCost({ durationSec: 8, resolution: "720p" }),
      85,
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

  it("V2V transform (décor) uses ultra grid", () => {
    assert.equal(
      computeV2VStudioCreditCost({
        sourceVideoDurationSec: 3,
        resolution: "720p",
        v2vProvider: "runway_aleph",
      }),
      85,
    );
    assert.equal(
      computeV2VStudioCreditCost({
        sourceVideoDurationSec: 5,
        resolution: "1080p",
        v2vProvider: "runway_aleph",
      }),
      80,
    );
    assert.equal(
      computeV2VStudioCreditCost({
        sourceVideoDurationSec: 5,
        resolution: "4k",
        v2vProvider: "runway_aleph",
      }),
      200,
    );
  });

  it("V2V motion (danse) uses motion COGS grid, no 4K surcharge", () => {
    assert.equal(
      computeV2VStudioCreditCost({
        sourceVideoDurationSec: 8,
        resolution: "720p",
        v2vProvider: "kling_motion",
      }),
      95,
    );
    assert.equal(
      computeV2VStudioCreditCost({
        sourceVideoDurationSec: 5,
        resolution: "720p",
        preserveSourceAudio: true,
        v2vProvider: "kling_motion",
      }),
      64,
    );
    assert.equal(
      computeV2VStudioCreditCost({
        sourceVideoDurationSec: 5,
        resolution: "4k",
        v2vProvider: "kling_motion",
      }),
      89,
    );
  });

  it("motion family exposes 720p and 1080p only", () => {
    assert.deepEqual(v2vResolutionsForEngineFamily("motion"), [
      "720p",
      "1080p",
    ]);
    assert.ok(v2vResolutionsForEngineFamily("transform").includes("4k"));
  });
});
