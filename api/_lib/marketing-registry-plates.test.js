const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  resolveMarketingRegistryPlate,
  buildMarketingRegistryPlateClarifier,
  extractUserRequestedPlate,
  slugifyVehicleRegistryId,
  _resetCacheForTests,
} = require("./marketing-registry-plates");

const deps = () => {
  const pg = require("./prompt-guard");
  return {
    isVehicleReplacePrompt: pg.isVehicleReplacePrompt,
    parseVehicleSpec: pg.parseVehicleSpec,
  };
};

test("extractUserRequestedPlate reads explicit immat", () => {
  assert.equal(
    extractUserRequestedPlate("Remplace ma voiture, plaque AB-123-CD"),
    "AB-123-CD",
  );
});

test("slugify from any vehicle label", () => {
  assert.equal(
    slugifyVehicleRegistryId("BMW M5 G90 sedan"),
    "bmw_m5_g90_sedan",
  );
});

test("any vehicle replace resolves env pre-plate by auto slug", () => {
  _resetCacheForTests();
  process.env.MARKETING_PLATE_BMW_M5_G90 = "BM-555-M5";
  try {
    const prompt = "Remplace ma voiture par une BMW M5 G90";
    const hit = resolveMarketingRegistryPlate(prompt, deps());
    assert.ok(hit);
    assert.equal(hit.plate, "BM-555-M5");
    assert.equal(hit.entryId, "bmw_m5_g90");
  } finally {
    delete process.env.MARKETING_PLATE_BMW_M5_G90;
    _resetCacheForTests();
  }
});

test("registry plate lock for SVJ when env plate set", () => {
  _resetCacheForTests();
  process.env.MARKETING_PLATE_LAMBORGHINI_AVENTADOR_SVJ = "SVJ-99-TEST";
  try {
    const prompt = "Remplace ma voiture par une Lamborghini SVG";
    const hit = resolveMarketingRegistryPlate(prompt, deps());
    assert.ok(hit);
    assert.equal(hit.plate, "SVJ-99-TEST");
    const clause = buildMarketingRegistryPlateClarifier(prompt, deps());
    assert.match(clause, /REGISTRY PLATE LOCK/i);
    assert.match(clause, /SVJ-99-TEST/);
    assert.match(clause, /band F|EU blue band F|SOURCE/i);
  } finally {
    delete process.env.MARKETING_PLATE_LAMBORGHINI_AVENTADOR_SVJ;
    _resetCacheForTests();
  }
});

test("multi pre-plates use source jurisdiction mode", () => {
  _resetCacheForTests();
  process.env.MARKETING_REGISTRY_PLATES_JSON = JSON.stringify({
    entries: [
      {
        id: "audi_rs3",
        verifyModel: "Audi RS3",
        plates: { EU_F: "AA-111-AA", EU_E: "1234-BBB" },
      },
    ],
  });
  try {
    const prompt = "Remplace la voiture par une Audi RS3";
    const hit = resolveMarketingRegistryPlate(prompt, deps());
    assert.equal(hit.mode, "source_jurisdiction");
    const clause = buildMarketingRegistryPlateClarifier(prompt, deps());
    assert.match(clause, /AA-111-AA/);
    assert.match(clause, /1234-BBB/);
    assert.match(clause, /band F|jurisdiction/i);
  } finally {
    delete process.env.MARKETING_REGISTRY_PLATES_JSON;
    _resetCacheForTests();
  }
});

test("no registry clause without configured pre-plate", () => {
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
