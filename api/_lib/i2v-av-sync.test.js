const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  I2VVoiceDurationExceedsTargetError,
  effectiveAvGapSec,
  passesAvDurationQa,
  getMaxAvGapSec,
  shouldRunI2VAvDurationQa,
} = require("./i2v-av-sync");

describe("i2v-av-sync", () => {
  it("effectiveAvGapSec computes absolute difference", () => {
    const gap = effectiveAvGapSec({ videoSec: 2.133, audioSec: 1.231 });
    assert.ok(Math.abs(gap - 0.902) < 0.001);
  });

  it("I2VVoiceDurationExceedsTargetError carries duration metadata", () => {
    const err = new I2VVoiceDurationExceedsTargetError({
      audioSec: 6.2,
      targetSec: 5,
    });
    assert.equal(err.code, "I2V_VOICE_TOO_LONG");
    assert.equal(err.audioSec, 6.2);
    assert.equal(err.targetSec, 5);
  });

  it("passesAvDurationQa respects 0.3s default threshold", () => {
    assert.equal(passesAvDurationQa(0.25), true);
    assert.equal(passesAvDurationQa(0.902), false);
    assert.equal(getMaxAvGapSec(), 0.3);
  });

  it("shouldRunI2VAvDurationQa only for pipeline v2 I2V with explicit voice", () => {
    assert.equal(
      shouldRunI2VAvDurationQa({ workflow: "image_to_video" }),
      false,
    );
    assert.equal(
      shouldRunI2VAvDurationQa({
        workflow: "image_to_video",
        i2v_avatar_pipeline_v2: true,
      }),
      false,
    );
    assert.equal(
      shouldRunI2VAvDurationQa({
        workflow: "image_to_video",
        i2v_avatar_pipeline_v2: true,
        voice_enabled: true,
        voice_text: "Bonjour, ceci est un test vocal.",
      }),
      true,
    );
    assert.equal(
      shouldRunI2VAvDurationQa({
        workflow: "video_to_video",
        i2v_avatar_pipeline_v2: true,
        voice_enabled: true,
        voice_text: "Hello world test voice",
      }),
      false,
    );
  });
});
