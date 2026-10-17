const { test } = require("node:test");
const assert = require("node:assert/strict");
const { shouldUseDeepChestClone } = require("./voice-deep-chest");

test("Mode C import sans WAV grave — pas de deep chest automatique", () => {
  assert.equal(
    shouldUseDeepChestClone({ generationMode: "C", cloneSourceType: "import" }),
    false,
  );
});

test("Mode B micro sans WAV grave n’active pas deep chest", () => {
  assert.equal(
    shouldUseDeepChestClone({ generationMode: "B", cloneSourceType: "record" }),
    false,
  );
});
