const test = require("node:test");
const assert = require("node:assert/strict");
const {
  extractKlingFailMessage,
  buildKlingMotionPrompt,
} = require("./kie-kling-motion");

test("buildKlingMotionPrompt verrouille corps entier et interdit face-swap", () => {
  const p = buildKlingMotionPrompt("Replace the dancer with my photo");
  assert.match(p, /FULL BODY|ENTIRE performer/i);
  assert.match(p, /FORBIDDEN.*face-swap/i);
  assert.match(p, /choreography|skeleton/i);
  assert.match(p, /Single subject only/i);
  assert.match(p, /blurred background/i);
  assert.match(p, /black background/i);
});

test("buildKlingMotionPrompt traduit le swap FR courant", () => {
  const p = buildKlingMotionPrompt(
    "Remplace la personne qui danse par celle de ma photo",
  );
  assert.match(p, /reference VIDEO clip/i);
  assert.match(p, /never animate on the photo/i);
});

test("extractKlingFailMessage lit failMsg et resultJson", () => {
  assert.equal(
    extractKlingFailMessage({ failMsg: "internal error, please try again later." }),
    "internal error, please try again later.",
  );
  assert.equal(
    extractKlingFailMessage({
      resultJson: JSON.stringify({ failMsg: "No valid characters detected" }),
    }),
    "No valid characters detected",
  );
});
