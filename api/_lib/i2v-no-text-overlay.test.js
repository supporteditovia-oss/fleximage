const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  appendI2VNoOnScreenTextLock,
  normalizeI2VTextOverlayFlags,
} = require("./i2v-no-text-overlay");

describe("i2v-no-text-overlay", () => {
  it("normalizeI2VTextOverlayFlags force subtitles and draw_text off", () => {
    const out = normalizeI2VTextOverlayFlags({
      workflow: "image_to_video",
      subtitles_enabled: true,
      draw_text: true,
      overlay_text: "hello",
      subtitles_pending: true,
    });
    assert.equal(out.subtitles_enabled, false);
    assert.equal(out.draw_text, false);
    assert.equal(out.overlay_text, null);
    assert.equal(out.subtitles_pending, false);
    assert.equal(out.i2v_no_onscreen_text_rev, 2);
  });

  it("appendI2VNoOnScreenTextLock includes no-subtitle rules", () => {
    const p = appendI2VNoOnScreenTextLock("Cinematic motion.");
    assert.match(p, /no subtitles/i);
    assert.match(p, /aucun texte/i);
    assert.doesNotMatch(p, /drawtext/i);
  });
});
