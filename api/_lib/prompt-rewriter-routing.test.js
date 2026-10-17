const test = require("node:test");
const assert = require("node:assert/strict");
const {
  shouldBypassRewriter,
  resolvePromptRewriterRouting,
  shouldUseFluxTextToImage,
} = require("./prompt-rewriter-routing");

test("bypass si Prompt Intelligent désactivé", () => {
  assert.equal(
    shouldBypassRewriter("tenue de luxe sur la plage", {
      promptIntelligentEnabled: false,
    }),
    true,
  );
});

test("pas de bypass pour outfit / voiture standard", () => {
  assert.equal(
    shouldBypassRewriter(
      "Remplace ma tenue par une robe Dior et garde le même décor",
    ),
    false,
  );
  assert.equal(
    shouldBypassRewriter("Change la voiture en Lamborghini Urus noir mat"),
    false,
  );
});

test("bypass célébrité / politique", () => {
  assert.equal(
    shouldBypassRewriter("Moi à côté de Macron au restaurant"),
    true,
  );
  assert.equal(shouldBypassRewriter("Selfie avec Ninho en backstage"), true);
});

test("bypass ambiance streetwear / fumée", () => {
  assert.equal(
    shouldBypassRewriter("Photo streetwear avec clope et fumée en fond"),
    true,
  );
  assert.equal(shouldBypassRewriter("Ambiance chicha sur un rooftop"), true);
});

test("FLUX uniquement en bypass sans image de référence", () => {
  const route = resolvePromptRewriterRouting({
    userPrompt: "Macron en studio",
    referenceImageCount: 0,
  });
  assert.equal(route.bypass, true);
  assert.equal(route.useFluxTextToImage, true);

  const withRef = resolvePromptRewriterRouting({
    userPrompt: "Macron en studio",
    referenceImageCount: 1,
  });
  assert.equal(withRef.useFluxTextToImage, false);
  assert.equal(
    shouldUseFluxTextToImage({ bypass: true, referenceImageCount: 2 }),
    false,
  );
});
