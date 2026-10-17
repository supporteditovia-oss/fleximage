const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildTtsOptions } = require("./fish-audio");

test("buildTtsOptions deep chest clone — moins de lissage", () => {
  const opts = buildTtsOptions("Interview Kaaris", {
    cloneFidelity: true,
    deepChestClone: true,
    speed: 1,
  });
  assert.equal(opts.temperature, 0.36);
  assert.equal(opts.top_p, 0.64);
  assert.equal(opts.prosody.speed, 0.92);
});

test("buildTtsOptions clone fidelity — paramètres validés", () => {
  const opts = buildTtsOptions("Bonjour test clone", { cloneFidelity: true, speed: 1.1 });
  assert.equal(opts.temperature, 0.46);
  assert.equal(opts.top_p, 0.72);
  assert.equal(opts.repetition_penalty, 1.02);
  assert.equal(opts.mp3_bitrate, 256);
  assert.equal(opts.condition_on_previous_chunks, false);
  assert.equal(opts.prosody.speed, 0.98);
});

test("buildTtsOptions inline identity Mode C — timbre marqué", () => {
  const opts = buildTtsOptions("Interview Jul", {
    cloneFidelity: true,
    inlineIdentityClone: true,
    speed: 1.05,
  });
  assert.equal(opts.temperature, 0.54);
  assert.equal(opts.top_p, 0.76);
  assert.equal(opts.repetition_penalty, 1.04);
  assert.equal(opts.prosody.speed, 0.99);
  assert.equal(opts.min_chunk_length, 120);
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

test("buildTtsOptions catalogue studio — débit catalogue sans fast flow", () => {
  const opts = buildTtsOptions("Salut c'est PLK", {
    cloneFidelity: false,
    catalogFastFlow: false,
    speed: 0.96,
  });
  assert.equal(opts.prosody.speed, 0.96);
  assert.equal(opts.condition_on_previous_chunks, false);
});
