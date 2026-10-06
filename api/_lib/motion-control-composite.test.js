const { test } = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const {
  shouldApplyMotionComposite,
  alphaBoundingBoxFromPng,
  computeDefaultSubjectBox,
} = require("./motion-control-composite");

test("shouldApplyMotionComposite only for uploaded user photo", () => {
  assert.equal(
    shouldApplyMotionComposite({
      imageUrl: "https://cdn/a.jpg",
      videoUrl: "https://cdn/b.mp4",
      motionReferenceSource: "uploaded",
    }),
    true,
  );
  assert.equal(
    shouldApplyMotionComposite({
      imageUrl: "https://cdn/a.jpg",
      videoUrl: "https://cdn/b.mp4",
      motionReferenceSource: "auto_frame",
    }),
    false,
  );
});

test("alphaBoundingBoxFromPng finds opaque region", async () => {
  const w = 200;
  const h = 300;
  const raw = Buffer.alloc(w * h * 4, 0);
  for (let y = 80; y < 220; y++) {
    for (let x = 60; x < 140; x++) {
      const i = (y * w + x) * 4;
      raw[i] = 200;
      raw[i + 1] = 100;
      raw[i + 2] = 50;
      raw[i + 3] = 255;
    }
  }
  const png = await sharp(raw, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();
  const box = await alphaBoundingBoxFromPng(png);
  assert.ok(box.width >= 70);
  assert.ok(box.height >= 130);
  assert.ok(box.left >= 52 && box.left <= 64);
  assert.ok(box.top >= 72 && box.top <= 84);
});

test("computeDefaultSubjectBox centers lower body", () => {
  const box = computeDefaultSubjectBox(720, 1280);
  assert.ok(box.top > 200);
  assert.ok(box.width < 720);
});
