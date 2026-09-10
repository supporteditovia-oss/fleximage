const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  getSourceVideoUrlFromLarp,
  isLikelyVideoAssetUrl,
} = require("./mux-source-audio");

describe("mux-source-audio helpers", () => {
  it("detects video asset urls", () => {
    assert.equal(
      isLikelyVideoAssetUrl(
        "https://cdn.example.com/inputs/u1/123-source.mp4",
      ),
      true,
    );
    assert.equal(
      isLikelyVideoAssetUrl("https://cdn.example.com/inputs/u1/123.jpg"),
      false,
    );
  });

  it("reads source_video_url from metadata", () => {
    const url = getSourceVideoUrlFromLarp({
      metadata: {
        workflow: "video_to_video",
        source_video_url: "https://cdn.example.com/inputs/u1/src.mp4",
      },
      input_assets: [],
    });
    assert.equal(url, "https://cdn.example.com/inputs/u1/src.mp4");
  });

  it("picks last video asset for v2v with reference image", () => {
    const url = getSourceVideoUrlFromLarp({
      metadata: { workflow: "video_to_video" },
      input_assets: [
        "https://cdn.example.com/inputs/u1/ref.jpg",
        "https://cdn.example.com/inputs/u1/999-source.mp4",
      ],
    });
    assert.equal(url, "https://cdn.example.com/inputs/u1/999-source.mp4");
  });
});
