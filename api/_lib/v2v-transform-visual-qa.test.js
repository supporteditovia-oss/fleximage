const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");

const {
  compareJpegFrames,
  passesTransformVisualThresholds,
  shouldRunV2VTransformVisualQa,
} = require("./v2v-transform-visual-qa");

async function solidJpeg(r, g, b) {
  return sharp({
    create: { width: 64, height: 64, channels: 3, background: { r, g, b } },
  })
    .jpeg()
    .toBuffer();
}

describe("v2v-transform-visual-qa", () => {
  it("shouldRunV2VTransformVisualQa for vehicle v2v only", () => {
    assert.equal(
      shouldRunV2VTransformVisualQa(
        { workflow: "video_to_video" },
        "Remplace ma BMW par une Urus",
      ),
      true,
    );
    assert.equal(
      shouldRunV2VTransformVisualQa(
        { workflow: "video_to_video" },
        "Danse TikTok meme",
      ),
      false,
    );
  });

  it("compareJpegFrames detects near-identical frames", async () => {
    const a = await solidJpeg(40, 40, 40);
    const b = await solidJpeg(42, 41, 40);
    const metrics = await compareJpegFrames(a, b);
    assert.ok(metrics.changedPixelRatio < 0.02);
    assert.ok(!passesTransformVisualThresholds(metrics));
  });

  it("compareJpegFrames passes strong interior change", async () => {
    const a = await solidJpeg(20, 30, 80);
    const b = await solidJpeg(200, 50, 40);
    const metrics = await compareJpegFrames(a, b);
    assert.ok(metrics.changedPixelRatio > 0.5);
    assert.ok(passesTransformVisualThresholds(metrics));
  });
});
