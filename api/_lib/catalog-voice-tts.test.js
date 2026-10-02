const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { resolveCatalogVoiceName } = require("./catalog-voice-tts");
const { lookupCatalogEntryByFishId } = require("./voice-catalog");

describe("catalog-voice-tts", () => {
  it("resolveCatalogVoiceName prefers explicit name then catalog entry", () => {
    const gazo = lookupCatalogEntryByFishId("0ff4b00e39e2429981b93bd7c6256d98");
    assert.ok(gazo);
    assert.equal(
      resolveCatalogVoiceName(gazo.fishId, null),
      "Gazo",
    );
    assert.equal(resolveCatalogVoiceName(gazo.fishId, "  Custom  "), "Custom");
  });
});
