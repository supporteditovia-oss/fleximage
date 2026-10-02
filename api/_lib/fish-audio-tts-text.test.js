const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeFishTtsText } = require("./fish-audio");
const { prepareVoiceTtsForFish } = require("./voice-humanize");

describe("normalizeFishTtsText", () => {
  it("trims and collapses whitespace only", () => {
    const out = normalizeFishTtsText("  Phrase un.   Phrase deux.  ");
    assert.equal(out, "Phrase un. Phrase deux.");
  });
});

describe("catalog TTS text pipeline", () => {
  it("prepareVoiceTtsForFish merges sentence breaks before Fish", () => {
    const out = prepareVoiceTtsForFish("Phrase un. Phrase deux. Phrase trois.");
    assert.doesNotMatch(out, /\.\s+Phrase/);
    assert.match(out, /Phrase un, Phrase deux, Phrase trois\./);
  });

  it("Tiakola sample reads as one continuous vocal line", () => {
    const raw =
      "Salut comment tu vas, c'est Tiakola là, j'aimerais te voir aujourd'hui.";
    const fish = prepareVoiceTtsForFish(raw, { voiceName: "Tiakola" });
    assert.match(fish, /Tia kola/i);
    assert.doesNotMatch(fish, /\.\s+comment/i);
  });
});
