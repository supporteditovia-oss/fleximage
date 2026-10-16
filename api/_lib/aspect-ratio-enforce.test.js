const test = require("node:test");
const assert = require("node:assert/strict");
const {
  enforceImageAspectRatioBuffer,
  targetPixelSize,
} = require("./aspect-ratio-enforce");

test("targetPixelSize portrait 9:16", () => {
  const t = targetPixelSize("9:16");
  assert.equal(t.width, 768);
  assert.equal(t.height, 1344);
});

test("targetPixelSize paysage 16:9", () => {
  const t = targetPixelSize("16:9");
  assert.equal(t.width, 1344);
  assert.equal(t.height, 768);
});

test("enforce recadre un buffer paysage vers 9:16", async () => {
  const sharp = require("sharp");
  const landscape = await sharp({
    create: {
      width: 800,
      height: 450,
      channels: 3,
      background: { r: 10, g: 20, b: 30 },
    },
  })
    .png()
    .toBuffer();

  const result = await enforceImageAspectRatioBuffer(landscape, "9:16");
  assert.equal(result.enforced, true);
  assert.equal(result.width, 768);
  assert.equal(result.height, 1344);
  const meta = await sharp(result.buffer).metadata();
  assert.equal(meta.width, 768);
  assert.equal(meta.height, 1344);
});

test("enforce recadre un buffer portrait vers 16:9", async () => {
  const sharp = require("sharp");
  const portrait = await sharp({
    create: {
      width: 450,
      height: 800,
      channels: 3,
      background: { r: 40, g: 50, b: 60 },
    },
  })
    .png()
    .toBuffer();

  const result = await enforceImageAspectRatioBuffer(portrait, "16:9");
  assert.equal(result.enforced, true);
  assert.equal(result.width, 1344);
  assert.equal(result.height, 768);
});
