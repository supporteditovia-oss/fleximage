const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  humanizeVoiceScript,
  expandFrenchChatShorthand,
} = require("./voice-humanize");

describe("voice-humanize", () => {
  it("expandFrenchChatShorthand decodes SLT and bb", () => {
    assert.equal(expandFrenchChatShorthand("slt cv bb"), "salut ça va bébé");
  });

  it("humanizeVoiceScript keeps display text, fixes fish text for Ninho + bébé", () => {
    const raw = "slt c'est Ninho je t'aime bébé reviens";
    const { displayText, fishText } = humanizeVoiceScript(raw);
    assert.equal(displayText, raw);
    assert.match(fishText, /Salut,/i);
    assert.match(fishText, /Ninho/i);
    assert.match(fishText, /bébé/i);
    assert.doesNotMatch(fishText, /\bslt\b/i);
  });
});
