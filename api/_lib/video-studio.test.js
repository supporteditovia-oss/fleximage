const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  computeVideoCreditCost,
  validateVoiceText,
  buildRunwayPrompt,
  buildCarSwapPrompt,
  maxVoiceCharsForDuration,
} = require("./video-studio");

describe("video-studio", () => {
  it("computeVideoCreditCost for 5s standard without voice", () => {
    assert.equal(
      computeVideoCreditCost({
        durationSec: 5,
        quality: "standard",
        voiceEnabled: false,
        isAdmin: false,
      }),
      20,
    );
  });

  it("computeVideoCreditCost adds voice and high quality", () => {
    assert.equal(
      computeVideoCreditCost({
        durationSec: 10,
        quality: "high",
        voiceEnabled: true,
        isAdmin: false,
      }),
      58,
    );
  });

  it("validateVoiceText blocks text too long for duration", () => {
    const long = "x".repeat(200);
    const result = validateVoiceText(long, 5);
    assert.equal(result.ok, false);
  });

  it("buildRunwayPrompt includes motion and single-shot policy", () => {
    const prompt = buildRunwayPrompt({
      motionPrompt: "Il marche calmement.",
      cameraMovement: "dolly_in",
      motionIntensity: "natural",
      style: "cinematic",
      voiceEnabled: false,
    });
    assert.match(prompt, /marche calmement/i);
    assert.match(prompt, /pas de diaporama/i);
  });

  it("maxVoiceCharsForDuration", () => {
    assert.equal(maxVoiceCharsForDuration(5), 140);
    assert.equal(maxVoiceCharsForDuration(10), 280);
  });

  it("computeVideoCreditCost for video_to_video scales with duration", () => {
    assert.equal(
      computeVideoCreditCost({
        workflow: "video_to_video",
        sourceVideoDurationSec: 6,
        isAdmin: false,
      }),
      25,
    );
    assert.equal(
      computeVideoCreditCost({
        workflow: "video_to_video",
        sourceVideoDurationSec: 14,
        isAdmin: false,
      }),
      38,
    );
  });

  it("buildCarSwapPrompt preserves scene lock", () => {
    const prompt = buildCarSwapPrompt("Lamborghini Urus");
    assert.match(prompt, /Lamborghini Urus/i);
    assert.match(prompt, /background/i);
    assert.match(prompt, /camera movement/i);
  });
});
