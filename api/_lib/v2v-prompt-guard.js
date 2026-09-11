/**
 * Empêche le contournement de l'option voix (+5 cr.) via le prompt V2V.
 * Le provider vidéo (Aleph/Kling) ne produit pas d'audio — la voix passe
 * uniquement par preserve / transform côté post-traitement.
 */

const VOICE_INTENT_RE =
  /\b(voix|voice|parle(?:r|nt|z)?|dis(?:ent|ent|ant|ant)?|chuchot(?:e|er|ant)?|murmur(?:e|er|ant)?|mielleux|mielleuse|douce(?:ment)?|grave|raque|rauque|sensuel(?:le)?|timbre|tonalit[ée]|accent|synchronis(?:ation|er)?\s*labiale?|lip[\s-]?sync|bouche\s*(?:qui\s*)?parle|audio|son\s+(?:de\s+)?(?:sa\s+)?voix|speak(?:ing|s)?|whisper(?:ing|s)?|vocal)\b/i;

/** Segments à retirer du prompt envoyé au provider vidéo (visuel seulement). */
const VOICE_CLAUSE_RE =
  /(?:,\s*|\.\s*|\s+)(?:(?:avec|and|having)\s+)?(?:une?\s+)?(?:voix|voice|parole|speech|audio)[^.;,]*(?=[.,;]|$)|(?:,\s*|\.\s*|\s+)(?:qui\s+)?(?:parle|speaks?|whispers?|murmur(?:e|er)?)\s+[^.,;]*/gi;

function detectVoiceIntentInPrompt(text) {
  return VOICE_INTENT_RE.test(String(text || ""));
}

function stripVoiceInstructionsFromPrompt(text) {
  let cleaned = String(text || "").trim();
  if (!cleaned) return cleaned;

  cleaned = cleaned.replace(VOICE_CLAUSE_RE, "");
  cleaned = cleaned.replace(/\s{2,}/g, " ").replace(/\s+([.,;])/g, "$1").trim();
  cleaned = cleaned.replace(/^[.,;\s]+|[.,;\s]+$/g, "").trim();

  return cleaned;
}

function validateV2vVoicePromptPolicy({ swapPrompt, v2vVoiceMode, uiLocale = "fr" }) {
  const prompt = String(swapPrompt || "").trim();
  if (!prompt || !detectVoiceIntentInPrompt(prompt)) {
    return { ok: true, visualPrompt: prompt };
  }

  if (v2vVoiceMode === "none") {
    return {
      ok: false,
      code: "V2V_VOICE_OPTION_REQUIRED",
      message:
        uiLocale === "fr"
          ? "Tu demandes une voix dans le prompt. Active une option voix (+5 cr.) : Voix femme, Voix homme ou Voix auto — ou retire les instructions vocales du texte."
          : "Your prompt requests voice changes. Enable a voice option (+5 credits) or remove voice instructions from the text.",
    };
  }

  if (v2vVoiceMode === "preserve") {
    return {
      ok: false,
      code: "V2V_VOICE_TRANSFORM_REQUIRED",
      message:
        uiLocale === "fr"
          ? "Pour changer le timbre de la voix, choisis Voix femme, Voix homme ou Voix auto — « Ma voix filmée » conserve ta voix originale."
          : "To change voice timbre, pick Female, Male, or Auto voice — « Preserve filmed voice » keeps your original recording.",
    };
  }

  const visualPrompt = stripVoiceInstructionsFromPrompt(prompt);
  if (visualPrompt.length < 5) {
    return {
      ok: false,
      code: "V2V_PROMPT_TOO_SHORT_AFTER_VOICE_STRIP",
      message:
        uiLocale === "fr"
          ? "Après retrait des instructions vocales, le prompt est trop court. Décris aussi le changement visuel souhaité."
          : "After removing voice instructions, the prompt is too short. Also describe the visual change.",
    };
  }

  return {
    ok: true,
    visualPrompt,
    voiceIntentDetected: true,
  };
}

function buildProviderPromptFromVisual(body, visualSwapDescription) {
  const custom =
    typeof body.vehicle_prompt === "string" ? body.vehicle_prompt.trim() : "";
  const visualCustom = stripVoiceInstructionsFromPrompt(custom) || visualSwapDescription;

  return { ...body, vehicle_prompt: visualCustom };
}

module.exports = {
  detectVoiceIntentInPrompt,
  stripVoiceInstructionsFromPrompt,
  validateV2vVoicePromptPolicy,
  buildProviderPromptFromVisual,
};
