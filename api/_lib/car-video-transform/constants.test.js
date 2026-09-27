const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildCarVideoPrompt } = require("./prompts");
const { validateDurationSeconds } = require("./validate");
const { estimateCarVideoCredits } = require("./constants");

test("validateDurationSeconds accepts 2-8s", () => {
  assert.equal(validateDurationSeconds(2).ok, true);
  assert.equal(validateDurationSeconds(8).ok, true);
  assert.equal(validateDurationSeconds(8.2).ok, false);
  assert.match(validateDurationSeconds(1).message, /2 et 8/);
});

test("buildCarVideoPrompt exterior includes vehicle", () => {
  const p = buildCarVideoPrompt({
    planType: "exterior",
    selectedVehicle: "luxury_black_suv",
  });
  assert.match(p, /luxury black SUV/i);
  assert.match(p, /Preserve the exact camera movement/i);
});

test("estimateCarVideoCredits 12 per second", () => {
  assert.equal(estimateCarVideoCredits(8), 96);
  assert.equal(estimateCarVideoCredits(2.1), 36);
});
