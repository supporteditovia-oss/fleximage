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
  assert.match(prompt, /YZ125 LOCK/i);
  assert.match(prompt, /BIKE SLOT LOCK|XXL/i);
  assert.match(prompt, /RIDER SCALE LOCK|rider body size unchanged|NEVER upscale/i);
  assert.doesNotMatch(prompt, /SEATED REALISM LOCK|straddle the seat facing the front wheel/i);
  assert.match(prompt, /PARKED LEAN LOCK|kickstand|tree/i);
  assert.match(prompt, /image 2|Image 2/i);
  assert.match(prompt, /HANDLEBAR GRIP LOCK|grip hand on/i);
  assert.match(prompt, /HAND GESTURE LOCK|middle finger/i);
  assert.match(prompt, /XXL|BIKE SLOT LOCK/i);
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

test("single-photo bike replace prepends anti-XXL and gesture locks", () => {
  const prompt = buildIdentityPreservingPrompt(
    "Remplace la moto par une Yamaha Tracer 7",
    { referenceImageCount: 1 },
  );
  assert.match(prompt, /BIKE SIZE LOCK|NEVER XXL/i);
  assert.match(prompt, /HAND GESTURE LOCK|middle finger/i);
  assert.match(prompt, /TRACER LOCK/i);
});
