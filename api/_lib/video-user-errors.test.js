const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  mapVideoProviderMessage,
  mapMotionCompositeUserMessage,
  inferMotionReferenceSource,
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

test("mapVideoProviderMessage — exhausted motion tab never shows cockpit tips", () => {
  const fr = mapVideoProviderMessage("internal error", "fr", {
    v2vExhausted: true,
    afterAlephFallback: true,
    v2vIntent: "motion",
    prompt: "Remplace le danseur par la personne de ma photo",
  });
  assert.doesNotMatch(fr, /volant|tableau de bord/i);
  assert.match(fr, /animer ce clip/i);
  assert.match(fr, /Jetons remboursés/);
});

test("mapVideoProviderMessage — motion fail before retries exhausted", () => {
  const fr = mapVideoProviderMessage("task failed", "fr", {
    v2vExhausted: false,
    afterAlephFallback: false,
    v2vIntent: "motion",
  });
  assert.match(fr, /réessaie automatiquement/i);
  assert.doesNotMatch(fr, /3 à 8 s/);
});

test("resolveKlingCharacterOrientation — video quand photo uploadée (A/B motion)", () => {
  assert.equal(
    resolveKlingCharacterOrientation("Remplace le danseur", true),
    "video",
  );
  assert.equal(
    resolveKlingCharacterOrientation("Remplace le danseur", true, "image"),
    "image",
  );
  assert.equal(resolveKlingCharacterOrientation("Urus", false), "video");
});

test("resolveKlingBackgroundSource — input_image si composite clean", () => {
  const { resolveKlingBackgroundSource } = require("./video-user-errors");
  assert.equal(
    resolveKlingBackgroundSource({ motionCleanCompositeApplied: true }),
    "input_image",
  );
  assert.equal(resolveKlingBackgroundSource({}), "input_video");
});

test("inferMotionReferenceSource — frame auto vs photo upload", () => {
  assert.equal(
    inferMotionReferenceSource(
      "https://cdn/inputs/u/123-motion-ref.jpg",
      null,
    ),
    "auto_frame",
  );
  assert.equal(
    inferMotionReferenceSource("https://cdn/inputs/u/photo.jpg", null),
    "uploaded",
  );
  assert.equal(
    inferMotionReferenceSource("https://cdn/x.jpg", "uploaded"),
    "uploaded",
  );
});

test("mapMotionCompositeUserMessage — vidéo illisible", () => {
  const msg = mapMotionCompositeUserMessage({
    code: "VIDEO_FRAME_EXTRACT_FAILED",
  });
  assert.match(msg, /720p/i);
});
