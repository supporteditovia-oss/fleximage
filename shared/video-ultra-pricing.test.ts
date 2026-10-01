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
      computeVideoUltraCreditCost({ durationSec: 3, resolution: "1080p" }),
      90,
    );
    assert.equal(
      computeVideoUltraCreditCost({ durationSec: 5, resolution: "1080p" }),
      110,
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
        sourceVideoDurationSec: 3,
        resolution: "1080p",
        v2vProvider: "runway_aleph",
      }),
      90,
    );
    assert.equal(
      computeV2VStudioCreditCost({
        sourceVideoDurationSec: 5,
        resolution: "1080p",
        v2vProvider: "runway_aleph",
      }),
      110,
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

  it("V2V motion (danse) — crédits ronds + montée par seconde", () => {
    assert.equal(
      computeV2VStudioCreditCost({
        sourceVideoDurationSec: 5,
        resolution: "720p",
        v2vProvider: "kling_motion",
      }),
      60,
    );
    assert.equal(
      computeV2VStudioCreditCost({
        sourceVideoDurationSec: 5,
        resolution: "1080p",
        v2vProvider: "kling_motion",
      }),
      90,
    );
    assert.equal(
      computeV2VStudioCreditCost({
        sourceVideoDurationSec: 6,
        resolution: "720p",
        v2vProvider: "kling_motion",
      }),
      70,
    );
    assert.equal(
      computeV2VStudioCreditCost({
        sourceVideoDurationSec: 5,
        resolution: "720p",
        preserveSourceAudio: true,
        v2vProvider: "kling_motion",
      }),
      65,
    );
    assert.equal(
      computeV2VStudioCreditCost({
        sourceVideoDurationSec: 5,
        resolution: "4k",
        v2vProvider: "kling_motion",
      }),
      90,
    );
  });

  it("transform grid keeps 720p < 1080p < 4k for every duration", () => {
    for (const d of [3, 4, 5, 6, 7, 8] as const) {
      const p720 = computeVideoUltraCreditCost({
        durationSec: d,
        resolution: "720p",
      });
      const p1080 = computeVideoUltraCreditCost({
        durationSec: d,
        resolution: "1080p",
      });
      const p4k = computeVideoUltraCreditCost({
        durationSec: d,
        resolution: "4k",
      });
      assert.ok(p720 < p1080, `${d}s: 720p ${p720} >= 1080p ${p1080}`);
      assert.ok(p1080 < p4k, `${d}s: 1080p ${p1080} >= 4k ${p4k}`);
      assert.equal(p720 % 5, 0);
      assert.equal(p1080 % 5, 0);
      assert.equal(p4k % 5, 0);
    }
  });

  it("motion family exposes 720p and 1080p only", () => {
    assert.deepEqual(v2vResolutionsForEngineFamily("motion"), [
      "720p",
      "1080p",
    ]);
    assert.ok(v2vResolutionsForEngineFamily("transform").includes("4k"));
  });
});
