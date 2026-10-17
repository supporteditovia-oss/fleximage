const { test } = require("node:test");
const assert = require("node:assert/strict");
const { shouldUseDeepChestClone } = require("./voice-deep-chest");

test("Mode C seul n’active pas deep chest (heuristique WAV uniquement)", () => {
  assert.equal(shouldUseDeepChestClone({ generationMode: "C" }), false);
});

test("Mode B micro sans WAV grave n’active pas deep chest", () => {
  assert.equal(
    shouldUseDeepChestClone({ generationMode: "B", cloneSourceType: "record" }),
    false,
  );
});
