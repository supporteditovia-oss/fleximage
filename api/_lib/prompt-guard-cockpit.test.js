const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildIdentityPreservingPrompt } = require("./prompt-guard");

test("RS3 interior swap: locks body pose and closed-door cluster", () => {
  const prompt = buildIdentityPreservingPrompt(
    "remplace l'intérieur de la voiture par RS3 vert pomme",
    { referenceImageCount: 1 },
  );
  assert.match(prompt, /COCKPIT INTERIOR SWAP/i);
  assert.match(prompt, /DOORS CLOSED LOCK/i);
  assert.match(prompt, /windshield traffic|never delete\/remove/i);
  assert.match(prompt, /GEN LOCK.*Audi RS3/i);
  assert.match(prompt, /User request:.*rs3/i);
});

test("ES Peugeot→Purosangue Mansory: cockpit swap + traffic lock", () => {
  const prompt = buildIdentityPreservingPrompt(
    "Convierte el interior de mi Peugeot en un Ferrari Purosangue Mansory: cuero negro y rojo, carbono, Alcantara y luz roja. Mismo ángulo, resultado hiperrealista.",
    { referenceImageCount: 1 },
  );
  assert.match(prompt, /COCKPIT INTERIOR SWAP/i);
  assert.match(prompt, /windshield traffic|never delete\/remove/i);
  assert.match(prompt, /screens-only|Vehicle Status/i);
  assert.match(prompt, /Convierte el interior/i);
  assert.match(prompt, /Purosangue|Ferrari|Mansory/i);
});
