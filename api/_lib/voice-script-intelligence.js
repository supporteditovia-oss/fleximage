/**
 * Gemini 2.5 Flash — ponctuation TTS (Clonage IA + catalogue).
 * Corrige virgules / points sans changer les mots.
 */
const {
  getGeminiApiKey,
  resolvePromptModel,
  DEFAULT_GEMINI_PROMPT_MODEL,
} = require("./prompt-intelligence");

const TIMEOUT_MS = 12_000;

const SYSTEM_INSTRUCTION_VOICE_TTS = `You are LuxeFlexIA Voice Script Intelligence for French text-to-speech.

Task: rewrite the user's message into ONE French line ready for a realistic voice clone.

Hard rules:
- Preserve EXACT words and meaning: do NOT add, remove, or replace words (names, slang, "bb", artist names stay verbatim).
- ONLY adjust punctuation and spacing (commas, apostrophes, one optional final period).
- Message must sound like ONE continuous spoken vocal note — no choppy stops.
- Do NOT use multiple sentence-ending periods in the middle. Prefer commas between clauses (e.g. "Salut, c'est Tiakola, je t'aime Louis, mon bébé" not "Salut. Je t'aime. Louis.").
- If the user wrote no punctuation, add light commas at natural breath points without over-segmenting.
- If the user over-used periods, replace mid-text periods with commas; keep at most one period at the very end.
- Keep proper nouns exactly spelled: Louis, Marie, Tiakola, Tchakola, etc.
- Output ONLY the corrected French text (no quotes, no markdown, no explanation).
- Max 2000 characters.`;

/**
 * @param {string} input
 * @param {{ locale?: string }} [options]
 * @returns {Promise<string>}
 */
async function enrichVoiceScriptForTts(input, options = {}) {
  const trimmed = String(input || "").trim();
  if (!trimmed) return trimmed;

  const apiKey = getGeminiApiKey();
  if (!apiKey) return trimmed;

  let model;
  try {
    model = resolvePromptModel();
  } catch (err) {
    console.warn("[voice-script-intelligence] model config:", err.message);
    return trimmed;
  }

  const localeHint =
    options.locale === "es"
      ? "User may mix Spanish; keep their words, fix punctuation for TTS."
      : options.locale === "en"
        ? "User may write in English; keep their words, fix punctuation for TTS."
        : "User writes in French (or franglais); keep their words, fix punctuation for TTS.";

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION_VOICE_TTS }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: `${localeHint}\n\nUser message:\n${trimmed}` }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(
        "[voice-script-intelligence] gemini_http",
        res.status,
        errText.slice(0, 160),
      );
      return trimmed;
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join("\n")
        .trim() || "";

    if (!text) return trimmed;

    const cleaned = text
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2000);

    return cleaned.length >= 2 ? cleaned : trimmed;
  } catch (err) {
    console.warn("[voice-script-intelligence] failed, using raw text:", err?.message);
    return trimmed;
  }
}

module.exports = {
  SYSTEM_INSTRUCTION_VOICE_TTS,
  enrichVoiceScriptForTts,
  DEFAULT_GEMINI_PROMPT_MODEL,
};
