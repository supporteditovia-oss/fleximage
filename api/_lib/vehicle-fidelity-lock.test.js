const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  isVehicleStickerRemovalPrompt,
  buildVehicleStickerPolicyClause,
  buildVehicleFidelityPromptBlock,
  isVehicleExteriorBodySwapPrompt,
} = require("./vehicle-fidelity-lock");
const { buildIdentityPreservingPrompt } = require("./prompt-guard");

test("detects sticker removal requests", () => {
  assert.equal(isVehicleStickerRemovalPrompt("enlève le A sur la vitre"), true);
  assert.equal(isVehicleStickerRemovalPrompt("sans autocollant"), true);
  assert.equal(isVehicleStickerRemovalPrompt("Lamborghini Urus noire"), false);
});

test("default sticker policy is pristine showroom", () => {
  const clause = buildVehicleStickerPolicyClause("Remplace par une Ferrari SF90");
  assert.match(clause, /PRISTINE FINISH/i);
  assert.match(clause, /no learner A\/L/i);
});

test("vehicle replace prompt injects occupancy and background locks", () => {
  const prompt = buildIdentityPreservingPrompt(
    "Remplace la voiture garée sur le parking par une Lamborghini Urus",
    { referenceImageCount: 1 },
  );
  assert.match(prompt, /OCCUPANCY LOCK|empty.*empty/i);
  assert.match(prompt, /BACKGROUND|car-wash|brushes/i);
  assert.match(prompt, /PRISTINE|no invented A/i);
  assert.match(prompt, /driver|learner sticker/i);
});

test("exterior body swap detection excludes pure interior edits", () => {
  assert.equal(
    isVehicleExteriorBodySwapPrompt("Remplace la voiture par une Urus"),
    true,
  );
  assert.equal(
    isVehicleExteriorBodySwapPrompt("Remplace l'intérieur par Mercedes AMG"),
    false,
  );
});

test("buildVehicleFidelityPromptBlock includes system injection", () => {
  const block = buildVehicleFidelityPromptBlock("swap car");
  assert.match(block, /if the car was empty/i);
  assert.match(block, /Negative prompt:/i);
});
