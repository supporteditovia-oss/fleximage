const test = require("node:test");
const assert = require("node:assert/strict");
const { extractKlingFailMessage } = require("./kie-kling-motion");

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
