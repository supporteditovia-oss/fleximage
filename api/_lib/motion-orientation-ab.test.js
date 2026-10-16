const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildMotionAbCompareHtml } = require("./motion-orientation-ab");
const { resolveKlingCharacterOrientation } = require("./video-user-errors");

test("resolveKlingCharacterOrientation honors override", () => {
  assert.equal(
    resolveKlingCharacterOrientation("", true, "video"),
    "video",
  );
  assert.equal(
    resolveKlingCharacterOrientation("", true, "image"),
    "image",
  );
  assert.equal(resolveKlingCharacterOrientation("", true), "image");
});

test("buildMotionAbCompareHtml includes both variants", () => {
  const html = buildMotionAbCompareHtml({
    shared: { compositeUrl: "https://cdn/x.jpg" },
    results: {
      video: { videoUrl: "https://cdn/v.mp4", state: "success" },
      image: { videoUrl: "https://cdn/i.mp4", state: "success" },
    },
  });
  assert.match(html, /character_orientation: video/);
  assert.match(html, /character_orientation: image/);
  assert.match(html, /v\.mp4/);
  assert.match(html, /i\.mp4/);
});
