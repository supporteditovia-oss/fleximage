const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  shouldUseDeepChestClone,
  shouldUseIncisiveClone,
  voiceNameHintsIncisive,
} = require("./voice-clone-timbre");

test("Mode C sans WAV grave n’active plus deep chest par défaut", () => {
  assert.equal(
    shouldUseDeepChestClone({ generationMode: "C", cloneSourceType: "import" }),
    false,
  );
});

test("Niska (nom) → profil incisif Mode C", () => {
  assert.equal(voiceNameHintsIncisive("Niska"), true);
  assert.equal(
    shouldUseIncisiveClone({
      generationMode: "C",
      cloneSourceType: "import",
      voiceName: "Niska",
      deliveryStyle: "casual",
    }),
    true,
  );
});

test("flux rap — incisif pour tout clone perso (Mode B ou C)", () => {
  assert.equal(
    shouldUseIncisiveClone({
      generationMode: "B",
      cloneSourceType: "record",
      deliveryStyle: "rap",
    }),
    true,
  );
  assert.equal(
    shouldUseIncisiveClone({
      generationMode: "C",
      cloneSourceType: "import",
      deliveryStyle: "hype",
    }),
    true,
  );
  assert.equal(
    shouldUseIncisiveClone({
      generationMode: "B",
      cloneSourceType: "record",
      deliveryStyle: "casual",
    }),
    false,
  );
});
