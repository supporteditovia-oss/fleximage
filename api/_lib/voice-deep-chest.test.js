const { test } = require("node:test");
const assert = require("node:assert/strict");
const { shouldUseDeepChestClone } = require("./voice-deep-chest");

test("Mode C import active deep chest", () => {
  assert.equal(
    shouldUseDeepChestClone({ generationMode: "C", cloneSourceType: "import" }),
    true,
  );
});

test("Mode B micro sans import n’active pas deep chest par défaut", () => {
  assert.equal(
    shouldUseDeepChestClone({ generationMode: "B", cloneSourceType: "record" }),
    false,
  );
});
