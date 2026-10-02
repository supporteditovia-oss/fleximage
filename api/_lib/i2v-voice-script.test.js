const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { prepareI2VVoiceTextForFish } = require("./i2v-voice-script");

describe("prepareI2VVoiceTextForFish", () => {
  it("maps raw AAAHHH bursts to speakable scream line", () => {
    const out = prepareI2VVoiceTextForFish("AAAAAAHHHHH");
    assert.match(out, /Aaaaah/i);
    assert.match(out, /Non/i);
  });

  it("humanizes normal dialogue", () => {
    const out = prepareI2VVoiceTextForFish("Au secours laisse-moi");
    assert.match(out, /secours/i);
  });
});
