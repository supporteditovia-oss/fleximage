const { hasCelebrityAppearanceInjection } = require("./celebrity-likeness");
const { looksLikeNamedPublicFigurePrompt } = require("./prompt-guard");

/** Ambiance street / fumée / clope — Gemini rewriter tends to sanitize these away. */
const STREETWEAR_AMBIANCE_RE =
  /\b(streetwear|street\s*wear|urbain|urban|hood|sneaker|sneakers|trap|drill|skate|skateboard|clope|cigarette|cigare|cigar|chicha|shisha|narguile|narguil[eé]|hookah|fumee|fum[eé]e|smoke|smoking|vape|vapot|blunt|joint|spliff|weed|marijuana|cannabis)\b/i;

function normalizePromptText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * @param {string} userPrompt
 * @param {{ promptIntelligentEnabled?: boolean }} [options]
 * @returns {boolean}
 */
function shouldBypassRewriter(userPrompt, options = {}) {
  return resolvePromptRewriterRouting({
    userPrompt,
    promptIntelligentEnabled: options.promptIntelligentEnabled,
  }).bypass;
}

/**
 * @param {{
 *   userPrompt: string,
 *   promptIntelligentEnabled?: boolean,
 *   templateId?: string | null,
 *   referenceImageCount?: number,
 * }} params
 */
function resolvePromptRewriterRouting(params) {
  const templateId = params.templateId;
  if (templateId) {
    return {
      bypass: true,
      reason: "catalog_template",
      useFluxTextToImage: false,
    };
  }

  const promptIntelligentEnabled = params.promptIntelligentEnabled !== false;
  if (!promptIntelligentEnabled) {
    return {
      bypass: true,
      reason: "user_disabled",
      useFluxTextToImage: shouldUseFluxTextToImage({
        bypass: true,
        referenceImageCount: params.referenceImageCount ?? 0,
      }),
    };
  }

  const text = String(params.userPrompt || "").trim();
  if (!text) {
    return { bypass: false, reason: null, useFluxTextToImage: false };
  }

  if (
    hasCelebrityAppearanceInjection(text) ||
    looksLikeNamedPublicFigurePrompt(text)
  ) {
    return {
      bypass: true,
      reason: "celebrity_or_public_figure",
      useFluxTextToImage: shouldUseFluxTextToImage({
        bypass: true,
        referenceImageCount: params.referenceImageCount ?? 0,
      }),
    };
  }

  const normalized = normalizePromptText(text);
  if (STREETWEAR_AMBIANCE_RE.test(normalized)) {
    return {
      bypass: true,
      reason: "streetwear_or_ambiance",
      useFluxTextToImage: shouldUseFluxTextToImage({
        bypass: true,
        referenceImageCount: params.referenceImageCount ?? 0,
      }),
    };
  }

  return { bypass: false, reason: null, useFluxTextToImage: false };
}

/** FLUX t2i libre — pas pour inpainting / édition avec photo de référence. */
function shouldUseFluxTextToImage({ bypass, referenceImageCount }) {
  return Boolean(bypass) && Number(referenceImageCount || 0) === 0;
}

module.exports = {
  shouldBypassRewriter,
  resolvePromptRewriterRouting,
  shouldUseFluxTextToImage,
  STREETWEAR_AMBIANCE_RE,
};
