const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  extractRequestedVehicleModel,
  buildImageVehicleIdentityBlock,
} = require("./luxe-vehicle-intelligence");

describe("luxe-vehicle-intelligence", () => {
  it("resolves Rolls-Royce La Rose Noire Droptail", () => {
    const m = extractRequestedVehicleModel(
      "Remplace ma voiture par une Rolls Royce la rose noire drop tail",
    );
    assert.match(m?.model || "", /La Rose Noire|Droptail/i);
    assert.match(m?.exterior || "", /two-seat|NOT a four-door/i);
  });

  it("buildImageVehicleIdentityBlock mentions exact model", () => {
    const block = buildImageVehicleIdentityBlock("Lamborghini Urus noir mat");
    assert.match(block, /Urus/i);
    assert.match(block, /IMAGE VEHICLE LOCK/i);
  });
});
