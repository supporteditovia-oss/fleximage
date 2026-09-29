const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildIdentityPreservingPrompt } = require("./prompt-guard");

test("RS3 interior swap: locks body pose and closed-door cluster", () => {
  const prompt = buildIdentityPreservingPrompt(
    "remplace l'intérieur de la voiture par RS3 vert pomme",
    { referenceImageCount: 1 },
  );
  assert.match(prompt, /COCKPIT INTERIOR SWAP/i);
  assert.match(prompt, /BODY POSE LOCK|COCKPIT BODY POSE/i);
  assert.match(prompt, /DOORS CLOSED LOCK/i);
  assert.match(prompt, /DOOR UI LOCK|DOOR STATUS LOCK|open-door/i);
  assert.match(prompt, /rs3|audi/i);
});
