const test = require("node:test");
const assert = require("node:assert/strict");
const { mapAlephState } = require("./kie-runway-aleph");

test("mapAlephState reste en attente sans errorCode explicite", () => {
  assert.equal(mapAlephState({ successFlag: 0 }), "waiting");
  assert.equal(mapAlephState({ successFlag: 0, errorCode: 0 }), "waiting");
});

test("mapAlephState échoue avec errorCode ou message", () => {
  assert.equal(mapAlephState({ successFlag: 0, errorCode: 400 }), "fail");
  assert.equal(
    mapAlephState({ successFlag: 0, errorMessage: "Video too large" }),
    "fail",
  );
});
