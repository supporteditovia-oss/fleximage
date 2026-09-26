const test = require("node:test");
const assert = require("node:assert/strict");
const { mapAlephState, extractAlephVideoUrl } = require("./kie-runway-aleph");

test("mapAlephState reste en attente sans errorCode explicite", () => {
  assert.equal(mapAlephState({ successFlag: 0 }), "waiting");
  assert.equal(mapAlephState({ successFlag: 0, errorCode: 0 }), "waiting");
});

test("mapAlephState échoue avec errorCode ou state fail", () => {
  assert.equal(mapAlephState({ successFlag: 0, errorCode: 400 }), "fail");
  assert.equal(
    mapAlephState({ state: "fail", errorMessage: "Video too large" }),
    "fail",
  );
  assert.equal(
    mapAlephState({ successFlag: 0, errorMessage: "Video too large" }),
    "waiting",
  );
});

test("mapAlephState jobs API (state success/fail)", () => {
  assert.equal(mapAlephState({ state: "success" }), "success");
  assert.equal(mapAlephState({ state: "fail" }), "fail");
  assert.equal(mapAlephState({ state: "waiting" }), "waiting");
});

test("extractAlephVideoUrl lit resultJson jobs", () => {
  assert.equal(
    extractAlephVideoUrl({
      resultJson: JSON.stringify({ resultUrls: ["https://x/v.mp4"] }),
    }),
    "https://x/v.mp4",
  );
});
