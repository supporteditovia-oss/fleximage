const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  CATALOG_SAMPLE_LINE,
  clampTtsSpeed,
  isValidFishReferenceId,
  resolveCatalogTtsSpeed,
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
      "voice-catalog/unified/v2/6be490a175744894826dd464cf3a5004.mp3",
    );
  });

  it("resolves per-voice Fish TTS speed from catalog rate", () => {
    assert.equal(
      resolveCatalogTtsSpeed("3cfa191ad09b4cfea8e4eebc4c31c923"),
      1.02,
    );
    assert.equal(
      resolveCatalogTtsSpeed("22b7c6809d5d405aa6a5ae2402272b53"),
      0.84,
    );
    assert.equal(resolveCatalogTtsSpeed("not-a-catalog-id"), null);
  });

  it("clamps tts speed to safe bounds", () => {
    assert.equal(clampTtsSpeed(2), 1.35);
    assert.equal(clampTtsSpeed(0.2), 0.65);
  });
});
