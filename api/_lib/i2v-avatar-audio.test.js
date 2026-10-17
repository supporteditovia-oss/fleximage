const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resolveI2VTtsOptions } = require("./i2v-avatar-audio");

test("I2V clone uses the expressive clone TTS profile", () => {
  const options = resolveI2VTtsOptions({
    voice_mode: "cloned",
    voice_clone_id: "owned-clone-id",
    voice_fish_reference_id: "a".repeat(32),
  });

  assert.deepEqual(options, {
    referenceId: "a".repeat(32),
    cloneFidelity: true,
    speed: 1.02,
  });
});

test("I2V catalog retains catalog synthesis options", () => {
  const options = resolveI2VTtsOptions({
    voice_mode: "catalog",
    voice_fish_reference_id: "a".repeat(32),
  });

  assert.equal(options.referenceId, "a".repeat(32));
  assert.equal(options.cloneFidelity, false);
  assert.equal(Object.hasOwn(options, "speed"), true);
});
