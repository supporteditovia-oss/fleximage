const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildIdentityPreservingPrompt } = require("./prompt-guard");

test("two-photo car swap uses image 2 reference guard", () => {
  const prompt = buildIdentityPreservingPrompt(
    "Remplace ma voiture par l'image 2",
    { referenceImageCount: 2 },
  );
  assert.match(prompt, /TWO-PHOTO SWAP/i);
  assert.match(prompt, /image 2/i);
  assert.match(prompt, /parking pose|scene\+camera lock/i);
  assert.match(prompt, /Juke|Silvia|Skyline/i);
});

test("cockpit swap keeps camera framing lock", () => {
  const prompt = buildIdentityPreservingPrompt(
    "Remplace l'intérieur par une Mercedes AMG, garde la route",
    { referenceImageCount: 1 },
  );
  assert.match(prompt, /COCKPIT CAMERA FRAMING LOCK/i);
  assert.match(prompt, /steering-wheel rotation/i);
  assert.match(prompt, /windshield traffic|never delete\/remove/i);
});
