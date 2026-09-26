const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { resolveSystemInstruction } = require("./prompt-intelligence");

describe("prompt-intelligence video modes", () => {
  it("resolveSystemInstruction returns v2v vehicle rules", () => {
    const text = resolveSystemInstruction("video_v2v");
    assert.match(text, /Video-to-Video/i);
    assert.match(text, /speedometer/i);
    assert.match(text, /silent/i);
  });

  it("resolveSystemInstruction returns i2v motion rules", () => {
    const text = resolveSystemInstruction("video_i2v", { voiceEnabled: false });
    assert.match(text, /Image-to-Video/i);
    assert.match(text, /Voice addon OFF/i);
  });

  it("resolveSystemInstruction keeps image default", () => {
    const text = resolveSystemInstruction("image");
    assert.match(text, /image-generation/i);
  });
});
