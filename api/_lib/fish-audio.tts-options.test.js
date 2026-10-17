const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildTtsOptions } = require("./fish-audio");

test("buildTtsOptions clone fidelity — paramètres validés", () => {
  const opts = buildTtsOptions("Bonjour test clone", { cloneFidelity: true, speed: 1.1 });
  assert.equal(opts.temperature, 0.42);
  assert.equal(opts.top_p, 0.68);
  assert.equal(opts.repetition_penalty, 1.01);
  assert.equal(opts.mp3_bitrate, 256);
  assert.equal(opts.condition_on_previous_chunks, false);
  assert.equal(opts.prosody.speed, 0.98);
});

test("buildTtsOptions catalogue — débit catalogue sans profil clone", () => {
  const opts = buildTtsOptions("Bonjour catalogue", { cloneFidelity: false, speed: 0.84 });
  assert.equal(opts.temperature, 0.6);
  assert.equal(opts.prosody.speed, 0.84);
});

test("buildTtsOptions catalogue fast flow — pas de plafond 1.0 ni chunks liés", () => {
  const opts = buildTtsOptions("Flow rap ".repeat(40), {
    cloneFidelity: false,
    catalogFastFlow: true,
    speed: 1.12,
  });
  assert.equal(opts.condition_on_previous_chunks, false);
  assert.equal(opts.prosody.speed, 1.12);
});
