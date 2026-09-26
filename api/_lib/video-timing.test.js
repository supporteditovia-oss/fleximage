const test = require("node:test");
const assert = require("node:assert/strict");
const { estimateVideoGenerationSeconds } = require("./video-timing");

test("I2V 5s standard ≈ 2 min", () => {
  assert.equal(
    estimateVideoGenerationSeconds({ workflow: "image_to_video", durationSec: 5 }),
    120,
  );
});

test("I2V 10s + voix + HD plus long", () => {
  assert.equal(
    estimateVideoGenerationSeconds({
      workflow: "image_to_video",
      durationSec: 10,
      quality: "high",
      voiceEnabled: true,
    }),
    225,
  );
});

test("V2V Runway Aleph dépend de la durée source", () => {
  assert.equal(
    estimateVideoGenerationSeconds({
      workflow: "video_to_video",
      v2vProvider: "runway_aleph",
      sourceVideoDurationSec: 5,
    }),
    210,
  );
  assert.equal(
    estimateVideoGenerationSeconds({
      workflow: "video_to_video",
      v2vProvider: "runway_aleph",
    }),
    235,
  );
});

test("V2V Kling Motion + son d'origine ≈ 5 min", () => {
  assert.equal(
    estimateVideoGenerationSeconds({
      workflow: "video_to_video",
      v2vProvider: "kling_motion",
      sourceVideoDurationSec: 8,
      preserveSourceAudio: true,
    }),
    320,
  );
});

test("durée source bornée au max V2V", () => {
  assert.equal(
    estimateVideoGenerationSeconds({
      workflow: "video_to_video",
      v2vProvider: "kling_motion",
      sourceVideoDurationSec: 60,
    }),
    estimateVideoGenerationSeconds({
      workflow: "video_to_video",
      v2vProvider: "kling_motion",
      sourceVideoDurationSec: 8,
    }),
  );
});
