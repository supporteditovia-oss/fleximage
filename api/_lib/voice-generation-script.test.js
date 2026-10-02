const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildVoiceGenerationScript } = require("./voice-generation-script");

describe("buildVoiceGenerationScript", () => {
  it("keeps user display text while humanizing fish text", async () => {
    const raw = "slt c'est Tchacola je t'aime Louis mon bébé";
    const script = await buildVoiceGenerationScript(raw, {
      gemini: false,
      voiceName: "Tiakola",
    });
    assert.equal(script.displayText, raw);
    assert.match(script.fishText, /Tia kola/i);
    assert.match(script.fishText, /Louie/i);
    assert.match(script.fishText, /Salut,/i);
  });

  it("falls back to local pipeline when gemini unavailable", async () => {
    const script = await buildVoiceGenerationScript("bonjour", { gemini: true });
    assert.equal(script.displayText, "bonjour");
    assert.ok(script.fishText.length >= 3);
  });
});
