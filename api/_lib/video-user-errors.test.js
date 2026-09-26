const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  mapVideoProviderMessage,
  resolveKlingCharacterOrientation,
} = require("./video-user-errors");

test("mapVideoProviderMessage — no valid characters", () => {
  const fr = mapVideoProviderMessage(
    "No valid characters detected in the video",
    "fr",
  );
  assert.match(fr, /personne|mains/i);
  assert.match(fr, /rembours/i);
});

test("resolveKlingCharacterOrientation — ref image → image", () => {
  assert.equal(
    resolveKlingCharacterOrientation("Je veux une Urus à Dubai", true),
    "image",
  );
  assert.equal(
    resolveKlingCharacterOrientation("Paysage calme", true),
    "image",
  );
  assert.equal(resolveKlingCharacterOrientation("Urus", false), "video");
});
