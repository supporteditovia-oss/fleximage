const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildIdentityPreservingPrompt } = require("./prompt-guard");

test("two-photo car swap uses image 2 reference guard", () => {
  const prompt = buildIdentityPreservingPrompt(
    "Remplace ma voiture par l'image 2",
    { referenceImageCount: 2 },
  );
  assert.match(prompt, /transplant the EXACT car from reference image 2/i);
});

test("par l'image 2 without brand name still routes to vehicle swap", () => {
  const prompt = buildIdentityPreservingPrompt(
    "Remplace ma voiture par l'image 2",
    { referenceImageCount: 2 },
  );
  assert.match(prompt, /TWO-PHOTO SWAP/i);
  assert.match(prompt, /image 2/i);
  assert.match(prompt, /parking pose|scene\+camera lock/i);
  assert.match(prompt, /Juke|Silvia|Skyline/i);
});

test("generic interior replace without brand name", () => {
  const prompt = buildIdentityPreservingPrompt(
    "Remplace l'intérieur de la voiture, garde tout pareil dehors",
    { referenceImageCount: 1 },
  );
  assert.match(prompt, /COCKPIT INTERIOR SWAP/i);
  assert.match(prompt, /steering-wheel rotation|steering wheel turned/i);
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

test("kyalima typo + Golf white inherit forbidden", () => {
  const prompt = buildIdentityPreservingPrompt(
    "remplace ma voiture en RS3 vert kyalima",
    { referenceImageCount: 1 },
  );
  assert.match(prompt, /PAINT LOCK/i);
  assert.match(prompt, /Kyalami Green/i);
  assert.match(prompt, /white Golf|original photo car paint/i);
  assert.match(prompt, /white Golf|original photo car paint/i);
});

test("vehicle swap locks OEM Kyalami green paint (not default white RS3)", () => {
  const prompt = buildIdentityPreservingPrompt(
    "Remplace ma voiture par une Audi RS3 vert Kyalami",
    { referenceImageCount: 1 },
  );
  assert.match(prompt, /PAINT LOCK/i);
  assert.match(prompt, /Kyalami Green/i);
  assert.match(prompt, /NOT default white|default press-car white/i);
  assert.match(prompt, /Factory paint color:.*Kyalami/i);
});

test("vehicle swap locks generic bleu marine", () => {
  const prompt = buildIdentityPreservingPrompt(
    "Remplace la voiture par une BMW M3 couleur bleu marine",
    { referenceImageCount: 1 },
  );
  assert.match(prompt, /PAINT LOCK/i);
  assert.match(prompt, /Navy blue|bleu marine/i);
});

test("two-photo swap with explicit paint keeps user color lock", () => {
  const prompt = buildIdentityPreservingPrompt(
    "Remplace ma voiture par une RS3 vert Kyalami avec l'image 2",
    { referenceImageCount: 2 },
  );
  assert.match(prompt, /PAINT LOCK/i);
  assert.match(prompt, /Kyalami/i);
  assert.match(prompt, /not default white/i);
});
