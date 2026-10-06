const test = require("node:test");
const assert = require("node:assert/strict");
const { estimateVideoGenerationSeconds } = require("./video-timing");

test("I2V 5s standard ≈ 1 min 50", () => {
  assert.equal(
    estimateVideoGenerationSeconds({ workflow: "image_to_video", durationSec: 5 }),
    110,
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
    190,
  );
});

test("V2V Kling Motion 3 s source", () => {
  assert.equal(
    estimateVideoGenerationSeconds({
      workflow: "video_to_video",
      v2vProvider: "kling_motion",
      sourceVideoDurationSec: 3,
    }),
    155,
  );
});

test("V2V Kling Motion 8 s + son d'origine", () => {
  assert.equal(
    estimateVideoGenerationSeconds({
      workflow: "video_to_video",
      v2vProvider: "kling_motion",
      sourceVideoDurationSec: 8,
      preserveSourceAudio: true,
    }),
    215,
  );
});

test("V2V Transform (Omni) 5 s source", () => {
  assert.equal(
    estimateVideoGenerationSeconds({
      workflow: "video_to_video",
      v2vProvider: "runway_aleph",
      sourceVideoDurationSec: 5,
    }),
    230,
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
