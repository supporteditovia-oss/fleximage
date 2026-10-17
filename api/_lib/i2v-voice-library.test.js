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

  it("10 voix actives (5 hommes, 5 femmes)", () => {
    const active = listActiveI2VLibraryEntries();
    assert.equal(active.length, 10);
    assert.equal(active.filter((e) => e.gender === "homme").length, 5);
    assert.equal(active.filter((e) => e.gender === "femme").length, 5);
  });

  it("default library voice", () => {
    assert.ok(resolveDefaultI2VLibraryVoiceId());
  });
});
