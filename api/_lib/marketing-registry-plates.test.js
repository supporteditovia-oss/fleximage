const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  resolveMarketingRegistryPlate,
  buildMarketingRegistryPlateClarifier,
  extractUserRequestedPlate,
  _resetCacheForTests,
} = require("./marketing-registry-plates");

const deps = () => {
  const pg = require("./prompt-guard");
  return {
    isVehicleReplacePrompt: pg.isVehicleReplacePrompt,
    parseVehicleSpec: pg.parseVehicleSpec,
    detectPlateLocation: pg.detectPlateLocation,
  };
};

test("extractUserRequestedPlate reads explicit immat", () => {
  assert.equal(
    extractUserRequestedPlate("Remplace ma voiture, plaque AB-123-CD"),
    "AB-123-CD",
  );
});

test("registry plate lock for SVJ when env plate set", () => {
  _resetCacheForTests();
  process.env.MARKETING_PLATE_LAMBORGHINI_AVENTADOR_SVJ = "SVJ-99-TEST";
  try {
    const prompt = "Remplace ma voiture par une Lamborghini SVG";
    const hit = resolveMarketingRegistryPlate(prompt, deps());
    assert.ok(hit);
    assert.equal(hit.plate, "SVJ-99-TEST");
    assert.match(hit.verifyModel, /SVJ/i);
    const clause = buildMarketingRegistryPlateClarifier(prompt, deps());
    assert.match(clause, /REGISTRY PLATE LOCK/i);
    assert.match(clause, /SVJ-99-TEST/);
  } finally {
    delete process.env.MARKETING_PLATE_LAMBORGHINI_AVENTADOR_SVJ;
    _resetCacheForTests();
  }
});

test("no registry clause without configured plate", () => {
  _resetCacheForTests();
  delete process.env.MARKETING_PLATE_LAMBORGHINI_AVENTADOR_SVJ;
  const prompt = "Remplace ma voiture par une Lamborghini SVJ";
  const clause = buildMarketingRegistryPlateClarifier(prompt, deps());
  assert.equal(clause, "");
});

test("user-provided plate wins over env", () => {
  _resetCacheForTests();
  process.env.MARKETING_PLATE_LAMBORGHINI_AVENTADOR_SVJ = "ENV-ONLY";
  try {
    const prompt =
      "Remplace ma voiture par une Lamborghini SVJ, plaque AA-111-BB";
    const hit = resolveMarketingRegistryPlate(prompt, deps());
    assert.equal(hit.plate, "AA-111-BB");
  } finally {
    delete process.env.MARKETING_PLATE_LAMBORGHINI_AVENTADOR_SVJ;
    _resetCacheForTests();
  }
});
