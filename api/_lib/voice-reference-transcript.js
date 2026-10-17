const { transcribeAudio } = require("./fish-audio");

/**
 * Nettoie la transcription ASR pour l’alignement Fish (syllabes / accents).
 */
function normalizeCloneReferenceTranscript(raw) {
  let text = String(raw || "")
    .normalize("NFC")
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();

  text = text.replace(/\s+/g, " ");
  /** ASR coupe parfois les liaisons : « j ai » → « j'ai » */
  text = text.replace(/\b([cjlmnsdt])\s+'?\s*([aeiouh])/gi, "$1'$2");
  text = text.replace(/\bqu\s+'?\s*([aeiou])/gi, "qu'$1");
  /** Tirets forcés par ASR entre syllabes d’un même mot */
  text = text.replace(/([a-zàâäéèêëïîôùûüç])-\s+([a-zàâäéèêëïîôùûüç])/gi, "$1$2");

  return text.slice(0, 4000);
}

function extractTranscriptFromAsrPayload(payload) {
  if (!payload || typeof payload !== "object") return "";
  const direct = String(payload.text || "").trim();
  if (Array.isArray(payload.segments) && payload.segments.length > 0) {
    const fromSegments = payload.segments
      .map((seg) => String(seg?.text || seg?.transcript || "").trim())
      .filter(Boolean)
      .join(" ")
      .trim();
    if (fromSegments.length >= direct.length - 2) {
      return fromSegments;
    }
  }
  if (Array.isArray(payload.words) && payload.words.length > 0) {
    const fromWords = payload.words
      .map((w) => String(w?.text || w?.word || "").trim())
      .filter(Boolean)
      .join(" ")
      .trim();
    if (fromWords.length >= 3) return fromWords;
  }
  return direct;
}

/**
 * ASR sur l’échantillon réellement envoyé à Fish (Mode C incisif = timestamps conservés).
 */
async function transcribeCloneReferenceAudio(audioBuffer, options = {}) {
  const language = options.language || "fr";
  const incisive = options.incisive === true;

  const raw = await transcribeAudio(audioBuffer, language, {
    ignoreTimestamps: !incisive,
    parsePayload: incisive,
  });

  const text =
    typeof raw === "string"
      ? raw
      : extractTranscriptFromAsrPayload(raw) || String(raw?.text || "");

  const normalized = normalizeCloneReferenceTranscript(text);
  if (normalized.length < 3) {
    throw Object.assign(
      new Error("Transcription vide. Utilise un extrait avec de la voix claire."),
      { status: 400, code: "empty_transcript" },
    );
  }
  return normalized;
}

module.exports = {
  normalizeCloneReferenceTranscript,
  extractTranscriptFromAsrPayload,
  transcribeCloneReferenceAudio,
};
