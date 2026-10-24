const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildIdentityPreservingPrompt,
  isOutfitFromReferencePrompt,
} = require("./prompt-guard");

test("detects outfit replace from image 2", () => {
  assert.equal(
    isOutfitFromReferencePrompt("Remplace mon outfit par l'image 2"),
    true,
  );
});

test("two-photo outfit on moto photo keeps identity, gesture, no tags", () => {
  const prompt = buildIdentityPreservingPrompt(
    "Remplace mon outfit par l'image 2, garde tout pareil",
    { referenceImageCount: 2 },
  );
  assert.match(prompt, /TWO-PHOTO OUTFIT SWAP/i);
  assert.match(prompt, /TWO-PHOTO OUTFIT SWAP|OUTFIT FROM REFERENCE/i);
  assert.match(prompt, /never the catalog model|catalog model face/i);
  assert.match(prompt, /middle finger|hand gestures|shush/i);
  assert.match(prompt, /OUTFIT TAG LOCK|hang tags|retail/i);
  assert.match(prompt, /motorcycle|scene lock/i);
  assert.doesNotMatch(prompt, /MOTORCYCLE\/SCOOTER FULL BODY SWAP/i);
});
