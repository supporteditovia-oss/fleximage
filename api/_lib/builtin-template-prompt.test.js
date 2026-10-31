const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  buildBuiltinTemplateFaceSwapPrompt,
  buildBuiltinTemplateFaceSwapWithOutfitPrompt,
} = require("./prompt-guard");

test("ready model face-swap prompt blocks floating shoes and wrong identity", () => {
  const prompt = buildBuiltinTemplateFaceSwapPrompt("Remplace la personne", {
    subjectPoseBlock: "",
  });
  assert.match(prompt, /PROP ZERO-EXTRA/i);
  assert.match(prompt, /floating shoe|extra floating shoe/i);
  assert.match(prompt, /IDENTITY STRICT/i);
  assert.match(prompt, /SAME individual as image 1/i);
});

test("ready model outfit prompt includes prop and identity locks", () => {
  const prompt = buildBuiltinTemplateFaceSwapWithOutfitPrompt("", {
    subjectPoseBlock: "",
  });
  assert.match(prompt, /PROP ZERO-EXTRA/i);
  assert.match(prompt, /IDENTITY STRICT/i);
});
