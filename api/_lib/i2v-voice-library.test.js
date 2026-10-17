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

  it("fish ids pack fondateur (5H/5F actifs)", () => {
    const {
      findI2VLibraryEntryByFishId,
    } = require("../../shared/i2v-voice-library.cjs");
    const femaleIds = [
      "690813f2df56491b82ee02a22d1c67fd",
      "5567200c7d8341738f0892bbacd3be3c",
      "64cf68b36fe5413681cd08d8360ec46c",
      "5f63c8657897428eac254dbf82926cc5",
      "c100ccdc6297427a90916fd2c63d4966",
    ];
    const maleIds = [
      "6d3a8a05a287483ab32da9891d7f7fc9",
      "593f6000dc4d4c93a8243468e4da8f73",
      "588134063cd047ffafc43114f3f26746",
      "ddec7fb67df34c3e955093c1d15ea7f5",
      "18b58d98762b4b0eb526dae3cf618a05",
    ];
    for (const fishId of [...femaleIds, ...maleIds]) {
      const entry = findI2VLibraryEntryByFishId(fishId);
      assert.ok(entry, fishId);
      assert.equal(entry.active, true);
    }
  });
});
