const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { mapImageProviderMessage, isImageProviderSafetyBlock } = require("./image-user-errors");

describe("image-user-errors", () => {
  it("detects model safety policy", () => {
    assert.equal(
      isImageProviderSafetyBlock(
        "The request was rejected by the model safety policy.",
      ),
      true,
    );
  });

  it("maps safety block to French guidance", () => {
    const msg = mapImageProviderMessage(
      "The request was rejected by the model safety policy.",
      "fr",
    );
    assert.match(msg, /Google/i);
    assert.match(msg, /rembours/i);
  });
});
