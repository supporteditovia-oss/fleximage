const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseI2VVoiceId,
  resolveDefaultI2VLibraryVoiceId,
  listActiveI2VLibraryEntries,
} = require("./i2v-voice-library");

describe("i2v-voice-library", () => {
  it("parse clone prefix", () => {
    const p = parseI2VVoiceId("clone:abc-123");
    assert.equal(p.kind, "clone");
    assert.equal(p.id, "abc-123");
  });

  it("parse library id", () => {
    const p = parseI2VVoiceId("i2v-fr-femme-chaleureuse");
    assert.equal(p.kind, "library");
  });

  it("12 voix actives en prod", () => {
    const active = listActiveI2VLibraryEntries();
    assert.equal(active.length, 12);
    assert.ok(active.some((e) => e.gender === "homme"));
    assert.ok(active.some((e) => e.gender === "femme"));
  });

  it("default library voice", () => {
    assert.ok(resolveDefaultI2VLibraryVoiceId());
  });
});
