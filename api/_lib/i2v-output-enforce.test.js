const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveI2VOutputSpecFromMeta,
  isValidI2VOutputSpec,
  i2vOutputHeightForQuality,
} = require("./i2v-output-enforce");

test("resolveI2VOutputSpecFromMeta maps quality to height", () => {
  assert.deepEqual(
    resolveI2VOutputSpecFromMeta({
      workflow: "image_to_video",
      duration_sec: 3,
      quality: "standard",
    }),
    { durationSec: 3, height: 720, quality: "standard" },
  );
  assert.deepEqual(
    resolveI2VOutputSpecFromMeta({
      duration_sec: 5,
      quality: "high",
    }),
    { durationSec: 5, height: 1080, quality: "high" },
  );
});

test("isValidI2VOutputSpec accepts the billing grid only", () => {
  assert.equal(isValidI2VOutputSpec({ durationSec: 3, height: 720 }), true);
  assert.equal(isValidI2VOutputSpec({ durationSec: 5, height: 1080 }), true);
  assert.equal(isValidI2VOutputSpec({ durationSec: 4, height: 720 }), false);
  assert.equal(isValidI2VOutputSpec({ durationSec: 3, height: 480 }), false);
});

test("i2vOutputHeightForQuality", () => {
  assert.equal(i2vOutputHeightForQuality("high"), 1080);
  assert.equal(i2vOutputHeightForQuality("standard"), 720);
});
