const test = require("node:test");
const assert = require("node:assert/strict");
const {
  pickAlephAspectFromDimensions,
  resolveAlephAspectForV2V,
} = require("./aleph-aspect-ratio");

test("paysage 1920x1080 → 16:9", () => {
  assert.equal(pickAlephAspectFromDimensions(1920, 1080), "16:9");
});

test("portrait 1080x1920 → 9:16", () => {
  assert.equal(pickAlephAspectFromDimensions(1080, 1920), "9:16");
});

test("POV habitacle : UI 9:16 mais pas de détection → 16:9", () => {
  assert.equal(
    resolveAlephAspectForV2V({
      userAspect: "9:16",
      vehiclePov: true,
    }),
    "16:9",
  );
});

test("POV habitacle : détection 9:16 ignorée → 16:9", () => {
  assert.equal(
    resolveAlephAspectForV2V({
      userAspect: "9:16",
      detectedAspect: "9:16",
      vehiclePov: true,
    }),
    "16:9",
  );
});
