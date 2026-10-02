const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  mapVideoProviderMessage,
  resolveKlingCharacterOrientation,
} = require("./video-user-errors");

test("mapVideoProviderMessage — internal error", () => {
  const fr = mapVideoProviderMessage(
    "internal error, please try again later.",
    "fr",
  );
  assert.match(fr, /incident temporaire/i);
});

test("mapVideoProviderMessage — no valid characters", () => {
  const fr = mapVideoProviderMessage(
    "No valid characters detected in the video",
    "fr",
  );
  assert.match(fr, /POV|studio/i);
});

test("mapVideoProviderMessage — exhausted car clip gives cockpit tips", () => {
  const fr = mapVideoProviderMessage("internal error", "fr", {
    v2vExhausted: true,
    afterAlephFallback: true,
    prompt: "Remplace ma BMW par une Urus",
  });
  assert.match(fr, /volant et tableau de bord/i);
  assert.match(fr, /Jetons remboursés/);
});

test("mapVideoProviderMessage — exhausted non-car clip stays generic", () => {
  const fr = mapVideoProviderMessage("internal error", "fr", {
    v2vExhausted: true,
    afterAlephFallback: true,
    prompt: "Transporte-moi à Dubai la nuit",
  });
  assert.doesNotMatch(fr, /habitacle|volant/i);
  assert.match(fr, /Jetons remboursés/);
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
