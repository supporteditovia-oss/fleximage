const { test } = require("node:test");
const assert = require("node:assert/strict");
const { isI2VSoundStudioEnabledForUser } = require("./i2v-sound-rollout");

test("i2v-sound-rollout", async (t) => {
  const prev = process.env.I2V_SOUND_STUDIO;
  t.after(() => {
    if (prev === undefined) delete process.env.I2V_SOUND_STUDIO;
    else process.env.I2V_SOUND_STUDIO = prev;
  });

  await t.test("défaut — admin seulement", () => {
    delete process.env.I2V_SOUND_STUDIO;
    assert.equal(isI2VSoundStudioEnabledForUser({ isAdmin: true }), true);
    assert.equal(
      isI2VSoundStudioEnabledForUser({ isAdmin: false, email: "test@gmail.com" }),
      false,
    );
    assert.equal(
      isI2VSoundStudioEnabledForUser({ email: "client@example.com" }),
      false,
    );
  });

  await t.test("I2V_SOUND_STUDIO=1 — tous", () => {
    process.env.I2V_SOUND_STUDIO = "1";
    assert.equal(
      isI2VSoundStudioEnabledForUser({ isAdmin: false }),
      true,
    );
  });

  await t.test("I2V_SOUND_STUDIO=0 — aucun", () => {
    process.env.I2V_SOUND_STUDIO = "0";
    assert.equal(isI2VSoundStudioEnabledForUser({ isAdmin: true }), false);
  });
});
