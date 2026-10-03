const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");

const {
  compareJpegFrames,
  compareJpegRegion,
  regionLooksUnchanged,
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

  it("steering ROI stays unchanged when only center of frame changes", async () => {
    const left = await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 3,
        background: { r: 30, g: 30, b: 30 },
      },
    })
      .jpeg()
      .toBuffer();
    const rightA = await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 3,
        background: { r: 10, g: 10, b: 200 },
      },
    })
      .jpeg()
      .toBuffer();
    const rightB = await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 3,
        background: { r: 200, g: 10, b: 10 },
      },
    })
      .jpeg()
      .toBuffer();
    const composite = async (rightBuf) =>
      sharp({
        create: {
          width: 256,
          height: 256,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .composite([
          { input: left, left: 0, top: 0 },
          { input: rightBuf, left: 128, top: 0 },
        ])
        .jpeg()
        .toBuffer();
    const frameA = await composite(rightA);
    const frameB = await composite(rightB);
    const global = await compareJpegFrames(frameA, frameB);
    assert.ok(passesTransformVisualThresholds(global));
    const region = { name: "lower_left", left: 0, top: 0, width: 128, height: 256 };
    const wheel = await compareJpegRegion(frameA, frameB, region, 256);
    assert.ok(regionLooksUnchanged(wheel));
  });
});
