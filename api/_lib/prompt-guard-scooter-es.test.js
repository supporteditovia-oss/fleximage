const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  buildIdentityPreservingPrompt,
  isMotorcycleReplacePrompt,
} = require("./prompt-guard");
const { mapImageProviderMessage } = require("./image-user-errors");

const ES_SCOOTER_SWAP =
  "Edita esta imagen manteniendo exactamente la misma escena, el mismo encuadre, la misma iluminación. " +
  "Solo reemplaza el scooter existente por una BMW S 1000 RR deportiva, negra y azul. No cambies nada más.";

test("Spanish reemplaza el scooter routes to motorcycle replace", () => {
  assert.equal(isMotorcycleReplacePrompt(ES_SCOOTER_SWAP), true);
});

test("Spanish scooter swap gets motorcycle inpaint guards", () => {
  const prompt = buildIdentityPreservingPrompt(ES_SCOOTER_SWAP, {
    referenceImageCount: 1,
  });
  assert.match(prompt, /MOTORCYCLE\/SCOOTER FULL BODY SWAP|INPAINT REPLACE/i);
  assert.match(prompt, /S1000RR LOCK|s1000/i);
});

test("maps provider motorcycle refusal to helpful ES message", () => {
  const msg = mapImageProviderMessage(
    "I can't generate an image of a motorcycle or scooter.",
    "es",
  );
  assert.match(msg, /reemplaza|Reemplaza|scooter/i);
});
