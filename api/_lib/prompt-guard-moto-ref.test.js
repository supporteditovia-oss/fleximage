const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildIdentityPreservingPrompt,
  isMotorcycleReplaceFromReferencePrompt,
} = require("./prompt-guard");

test("detects two-photo motorcycle replace from reference", () => {
  assert.equal(
    isMotorcycleReplaceFromReferencePrompt(
      "Remplace la moto par l'image 2",
      2,
    ),
    true,
  );
  assert.equal(
    isMotorcycleReplaceFromReferencePrompt(
      "Remplace ma voiture par l'image 2",
      2,
    ),
    false,
  );
});

test("two-photo YZ125 swap prioritizes scale, seating, and image 2 bike", () => {
  const prompt = buildIdentityPreservingPrompt(
    "Remplace la moto de l'image 1 par la Yamaha 125 YZ de l'image 2, même pose",
    { referenceImageCount: 2 },
  );
  assert.match(prompt, /TWO-PHOTO BIKE SWAP/i);
  assert.match(prompt, /TWO-PHOTO MOTORCYCLE SWAP/i);
  assert.match(prompt, /transplant the EXACT motorcycle from reference image 2/i);
  assert.match(prompt, /YZ125 LOCK/i);
  assert.match(prompt, /full-size motocross|Real-world factory scale/i);
  assert.match(prompt, /SEATED REALISM|straddl/i);
  assert.match(prompt, /Use image 2 as the exact target motorcycle/i);
});
