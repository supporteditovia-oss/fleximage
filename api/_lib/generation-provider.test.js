const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeProviderForDb,
  resolveVideoGenerationProvider,
} = require("./generation-provider");

describe("generation-provider", () => {
  it("maps v2v providers to DB-safe values", () => {
    assert.equal(normalizeProviderForDb("runway_aleph"), "runway");
    assert.equal(normalizeProviderForDb("kling_motion"), "kie");
    assert.equal(normalizeProviderForDb("runway"), "runway");
  });

  it("resolveVideoGenerationProvider for workflows", () => {
    assert.equal(resolveVideoGenerationProvider("image_to_video", null), "runway");
    assert.equal(
      resolveVideoGenerationProvider("video_to_video", "runway_aleph"),
      "runway",
    );
    assert.equal(
      resolveVideoGenerationProvider("video_to_video", "kling_motion"),
      "kie",
    );
  });
});
