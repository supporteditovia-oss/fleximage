const { test } = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const {
  shouldApplyMotionComposite,
  alphaBoundingBoxFromPng,
  computeDefaultSubjectBox,
  expandBoxForFullBodyReplacement,
  alignSubjectBoxToOriginalDancer,
  SUBJECT_OCCUPANCY_MIN,
  SUBJECT_OCCUPANCY_MAX,
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
  assert.equal(
    shouldApplyMotionComposite({
      imageUrl: "https://cdn/a.jpg",
      videoUrl: "https://cdn/b.mp4",
    }),
    false,
    "sans motionReferenceSource uploaded, pas de composite (évite fallback Kling mini overlay)",
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
  assert.ok(box.left >= 48 && box.left <= 68);
  assert.ok(box.top >= 64 && box.top <= 88);
});

test("computeDefaultSubjectBox centers lower body", () => {
  const box = computeDefaultSubjectBox(720, 1280);
  assert.ok(box.top > 150);
  assert.ok(box.width < 720);
});

test("expandBoxForFullBodyReplacement enlarges small head crops", () => {
  const small = { left: 300, top: 100, width: 120, height: 180 };
  const expanded = expandBoxForFullBodyReplacement(small, 720, 1280);
  assert.ok(expanded.height >= Math.round(1280 * 0.58));
  assert.ok(expanded.top + expanded.height >= 1280 * 0.95);
});

test("alignSubjectBoxToOriginalDancer lifts tiny detections to ~70% height", () => {
  const tinyFeet = { left: 280, top: 980, width: 160, height: 260 };
  const aligned = alignSubjectBoxToOriginalDancer(tinyFeet, 720, 1280);
  assert.ok(aligned.occupancy >= SUBJECT_OCCUPANCY_MIN - 0.01);
  assert.ok(aligned.occupancy <= SUBJECT_OCCUPANCY_MAX + 0.01);
  assert.ok(aligned.top + aligned.height >= 1280 * 0.97);
});

test("alignSubjectBoxToOriginalDancer preserves tall dancer bbox", () => {
  const dancer = { left: 200, top: 180, width: 320, height: 1020 };
  const aligned = alignSubjectBoxToOriginalDancer(dancer, 720, 1280);
  assert.ok(aligned.height >= Math.round(1280 * 0.78));
  assert.ok(aligned.occupancy <= SUBJECT_OCCUPANCY_MAX + 0.02);
});

test("computeDefaultSubjectBox targets ~80% canvas height", () => {
  const box = computeDefaultSubjectBox(720, 1280);
  const occ = box.height / 1280;
  assert.ok(occ >= SUBJECT_OCCUPANCY_MIN);
  assert.ok(occ <= SUBJECT_OCCUPANCY_MAX);
});
