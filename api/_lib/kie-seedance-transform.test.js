const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveSeedanceModelAndResolution,
  buildSeedanceTransformCreateTaskBody,
} = require("./kie-seedance-transform");

describe("kie-seedance-transform", () => {
  it("maps 4k to seedance-2 and 1080p to seedance-2-5", () => {
    assert.deepEqual(resolveSeedanceModelAndResolution("4k"), {
      model: "bytedance/seedance-2",
      resolution: "4k",
    });
    assert.deepEqual(resolveSeedanceModelAndResolution("1080p"), {
      model: "bytedance/seedance-2-5",
      resolution: "1080p",
    });
  });

  it("buildSeedanceTransformCreateTaskBody uses reference_video_urls", () => {
    const body = buildSeedanceTransformCreateTaskBody({
      prompt: "Replace BMW interior with Urus OEM cabin.",
      videoUrl: "https://example.com/source.mp4",
      resolution: "720p",
      durationSec: 5,
    });
    const { payload } = (() => {
      const { _durationFallbackSec, ...rest } = body;
      return { payload: rest, fallback: _durationFallbackSec };
    })();
    assert.equal(payload.model, "bytedance/seedance-2-5");
    assert.deepEqual(payload.input.reference_video_urls, [
      "https://example.com/source.mp4",
    ]);
    assert.equal(payload.input.duration, -1);
    assert.equal(payload.input.generate_audio, false);
  });
});
