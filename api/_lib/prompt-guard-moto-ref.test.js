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
    "Remplace la moto de l'image 1 par la Yamaha 125 YZ de l'image 2, garde ma pose et mes mains",
    { referenceImageCount: 2 },
  );
  assert.match(prompt, /TWO-PHOTO BIKE SWAP/i);
  assert.match(prompt, /YZ125 LOCK/i);
  assert.match(prompt, /BIKE SIZE LOCK|NEVER XXL|NOT XXL/i);
  assert.match(prompt, /RIDER OCCUPANCY|mes mains|occupancy/i);
  assert.doesNotMatch(prompt, /SEATED REALISM LOCK|straddle the seat facing the front wheel/i);
  assert.match(prompt, /HANDLEBAR YAW|steering rotation/i);
  assert.match(prompt, /image 2|Image 2/i);
  assert.match(prompt, /BIKE MERGE \+ OCCLUSION LOCK|hidden behind|partial visibility/i);
});

test("two uploads + replace moto triggers two-photo swap without saying image 2", () => {
  assert.equal(
    isMotorcycleReplaceFromReferencePrompt("Remplace la moto par une Yamaha Tracer 7", 2),
    true,
  );
  const prompt = buildIdentityPreservingPrompt(
    "Remplace la moto par une Yamaha Tracer 7",
    { referenceImageCount: 2 },
  );
  assert.match(prompt, /TWO-PHOTO BIKE SWAP|TWO-PHOTO MOTORCYCLE SWAP/i);
  assert.match(
    prompt,
    /IMAGE 2 SCENE FORBIDDEN|NEVER copy image 2 background|model\/color\/parts identity ONLY/i,
  );
  assert.doesNotMatch(prompt, /SEATED REALISM LOCK/i);
});

test("two-photo Tracer swap locks merge and occlusion behind tree", () => {
  const prompt = buildIdentityPreservingPrompt(
    "Remplace la moto de la première photo par le modèle de l'image 2 Yamaha Tracer 7",
    { referenceImageCount: 2 },
  );
  assert.match(prompt, /BIKE MERGE \+ OCCLUSION LOCK/i);
  assert.match(prompt, /tree|hidden|partial visibility|alpha-composite/i);
  assert.match(prompt, /TRACER LOCK/i);
});

test("YZ125 swap locks YZ graphics and rider clothing text", () => {
  const prompt = buildIdentityPreservingPrompt(
    "Remplace la moto par une Yamaha 125 YZ",
    { referenceImageCount: 1 },
  );
  assert.match(prompt, /YZ GRAPHICS LOCK|letter-perfect \"YZ\"/i);
  assert.match(prompt, /RIDER CLOTHING LOCK|STREET/i);
});

test("moto replace includes inpaint orientation and scene policy", () => {
  const prompt = buildIdentityPreservingPrompt(
    "Remplace la moto par une Yamaha Tracer 7",
    { referenceImageCount: 2 },
  );
  assert.match(prompt, /INPAINT REPLACE POLICY|ORIENTATION\+PERSPECTIVE\+SCENE|INPAINT REPLACE:/i);
  assert.match(prompt, /mirror flip|same facing/i);
  assert.match(prompt, /camera angle|PERSPECTIVE/i);
  assert.match(prompt, /background|scene pixels frozen|SCENE INPAINT/i);
});

test("single-photo bike replace prepends anti-XXL and empty-controls for no-rider prompt", () => {
  const prompt = buildIdentityPreservingPrompt(
    "Remplace la moto par une Yamaha Tracer 7",
    { referenceImageCount: 1 },
  );
  assert.match(prompt, /BIKE SIZE LOCK|NEVER XXL/i);
  assert.match(prompt, /RIDER OCCUPANCY|EMPTY CONTROLS|no hands/i);
  assert.match(prompt, /HANDLEBAR YAW|steering rotation/i);
  assert.match(prompt, /TRACER LOCK/i);
  assert.doesNotMatch(prompt, /HAND GESTURE LOCK.*middle finger/i);
});

test("TMAX 560 POV swap locks occupancy, yaw, and factory model", () => {
  const prompt = buildIdentityPreservingPrompt(
    "Remplace la moto par un Yamaha TMAX 560 vue guidon",
    { referenceImageCount: 1 },
  );
  assert.match(prompt, /TMAX LOCK|TMAX 560/i);
  assert.match(prompt, /COCKPIT LOCK|analog speedo|monochrome LCD/i);
  assert.match(prompt, /Quad Lock|phone mount.*OPTIONAL|omit unless/i);
  assert.match(prompt, /FORBIDDEN full-width touchscreen|full-width touchscreen/i);
  assert.match(prompt, /EMPTY CONTROLS|RIDER OCCUPANCY/i);
  assert.match(prompt, /HANDLEBAR YAW|turned left/i);
  assert.match(prompt, /mirrors reflect|scenery only|NEVER reflect rider/i);
});
