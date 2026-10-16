const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  detectI2VSoundHeuristic,
  normalizeDetection,
  resolveI2VSoundForGeneration,
  CONFIDENCE_MIN,
} = require("./i2v-sound-auto");

describe("i2v-sound-auto", () => {
  it("arrestation police → sirène + foule", () => {
    const d = detectI2VSoundHeuristic("arrestation par la police en ville");
    assert.equal(d.sfx, "sirene_police");
    assert.equal(d.ambiance, "crowd_protest");
    assert.ok(d.confidence >= CONFIDENCE_MIN);
    assert.match(d.label_fr, /Sirène/i);
  });

  it("paysage calme montagne → aucun son", () => {
    const d = detectI2VSoundHeuristic("paysage calme montagne au lever du soleil");
    assert.equal(d.sfx, null);
    assert.equal(d.ambiance, "none");
    assert.ok(d.confidence < CONFIDENCE_MIN);
  });

  it("toggle OFF → client silence (no auto apply)", async () => {
    process.env.I2V_SOUND_AUTO_HEURISTIC_ONLY = "1";
    const r = await resolveI2VSoundForGeneration({
      motionPrompt: "arrestation par la police",
      soundAutoEnabled: false,
      manualOverride: false,
      clientAmbience: "none",
      clientSfx: "none",
    });
    assert.equal(r.ambience, "none");
    assert.equal(r.sfx, "none");
    assert.equal(r.soundAutoMeta.enabled, false);
  });

  it("override manuel → choix client, overridden true", async () => {
    process.env.I2V_SOUND_AUTO_HEURISTIC_ONLY = "1";
    const r = await resolveI2VSoundForGeneration({
      motionPrompt: "arrestation par la police",
      soundAutoEnabled: true,
      manualOverride: true,
      clientAmbience: "street",
      clientSfx: "explosion",
      clientSfxMoment: "start",
    });
    assert.equal(r.ambience, "street");
    assert.equal(r.sfx, "explosion");
    assert.equal(r.sfxMoment, "start");
    assert.equal(r.soundAutoMeta.overridden, true);
  });

  it("confidence < 0.6 force silence", () => {
    const d = normalizeDetection({
      ambiance: "street",
      sfx: "explosion",
      sfx_moment: "middle",
      confidence: 0.55,
      label_fr: "test",
    });
    assert.equal(d.ambiance, "none");
    assert.equal(d.sfx, null);
  });
});
