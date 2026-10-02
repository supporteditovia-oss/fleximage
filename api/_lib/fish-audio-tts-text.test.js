const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeFishTtsText } = require("./fish-audio");

describe("normalizeFishTtsText", () => {
  it("merges sentence breaks for every synthesizeSpeech caller", () => {
    const out = normalizeFishTtsText("Phrase un. Phrase deux. Phrase trois.");
    assert.doesNotMatch(out, /\.\s+Phrase/);
    assert.match(out, /Phrase un, Phrase deux, Phrase trois\./);
  });
});
