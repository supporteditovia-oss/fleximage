const test = require("node:test");
const assert = require("node:assert/strict");
const {
  extractKlingFailMessage,
  buildKlingMotionPrompt,
} = require("./kie-kling-motion");

test("buildKlingMotionPrompt verrouille fond vidéo et identité image", () => {
  const p = buildKlingMotionPrompt("Replace the dancer with my photo");
  assert.match(p, /reference VIDEO/i);
  assert.match(p, /never use the static photo as the scene/i);
  assert.match(p, /reference IMAGE/i);
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
