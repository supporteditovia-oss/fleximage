/**
 * Pipeline texte voix : Gemini (ponctuation) → humanize (prononciation + flux Fish).
 */
const { humanizeVoiceScript } = require("./voice-humanize");
const { enrichVoiceScriptForTts } = require("./voice-script-intelligence");

/**
 * @param {string} userText
 * @param {{
 *   voiceName?: string | null;
 *   enabled?: boolean;
 *   gemini?: boolean;
 *   locale?: string;
 *   style?: string;
 * }} [options]
 */
async function buildVoiceGenerationScript(userText, options = {}) {
  const displayText = String(userText || "").trim();
  if (!displayText) {
    return {
      displayText: "",
      fishText: "",
      humanized: false,
      pronunciationFixed: false,
      geminiPunctuationApplied: false,
      geminiWorkingText: "",
    };
  }

  let workingText = displayText;
  let geminiPunctuationApplied = false;
  const useGemini = options.gemini !== false;

  if (useGemini && options.enabled !== false) {
    const enriched = await enrichVoiceScriptForTts(workingText, {
      locale: options.locale,
    });
    if (enriched && enriched.trim() && enriched.trim() !== workingText) {
      workingText = enriched.trim();
      geminiPunctuationApplied = true;
    }
  }

  const script = humanizeVoiceScript(workingText, {
    enabled: options.enabled !== false,
    voiceName: options.voiceName ?? null,
    displayTextOverride: displayText,
  });

  return {
    ...script,
    geminiPunctuationApplied,
    geminiWorkingText: workingText,
  };
}

module.exports = {
  buildVoiceGenerationScript,
};
