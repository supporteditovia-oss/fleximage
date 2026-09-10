const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  CATALOG_SAMPLE_LINE,
  isValidFishReferenceId,
  unifiedPreviewCacheKey,
} = require("./voice-catalog");

describe("voice-catalog", () => {
  it("uses a unified sample line", () => {
    assert.match(CATALOG_SAMPLE_LINE, /Dubai Marina/i);
  });

  it("validates fish reference ids", () => {
    assert.equal(
      isValidFishReferenceId("6be490a175744894826dd464cf3a5004"),
      true,
    );
    assert.equal(isValidFishReferenceId("invalid"), false);
  });

  it("builds stable cache keys", () => {
    assert.equal(
      unifiedPreviewCacheKey("6BE490A175744894826DD464CF3A5004"),
      "voice-catalog/unified/6be490a175744894826dd464cf3a5004.mp3",
    );
  });
});
