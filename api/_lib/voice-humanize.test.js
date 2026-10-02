const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  humanizeVoiceScript,
  expandFrenchChatShorthand,
  flowFrenchVocalDelivery,
  prepareVoiceTtsForFish,
} = require("./voice-humanize");

describe("voice-humanize", () => {
  it("expandFrenchChatShorthand decodes SLT and bb", () => {
    assert.equal(expandFrenchChatShorthand("slt cv bb"), "salut ça va bébé");
  });

  it("flowFrenchVocalDelivery merges phrases without sentence breaks", () => {
    const raw =
      "Salut bébé. Je vais penser à toi. Appelle-moi quand tu peux.";
    const flowed = flowFrenchVocalDelivery(raw);
    assert.doesNotMatch(flowed, /\.\s+Je/);
    assert.match(flowed, /Salut bébé, Je vais penser à toi,/i);
  });

  it("prepareVoiceTtsForFish applies flow for any voice name (catalog + clone)", () => {
    const raw = "Salut bébé.\nJe t'appelle ce soir.";
    const maes = prepareVoiceTtsForFish(raw, { voiceName: "Maes" });
    const clone = prepareVoiceTtsForFish(raw, { voiceName: "Mon clone" });
    assert.doesNotMatch(maes, /\.\s+Je/);
    assert.doesNotMatch(clone, /\.\s+Je/);
    assert.match(maes, /Salut.*bébé.*Je t'appelle ce soir/i);
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
