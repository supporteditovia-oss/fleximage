const { applyFrenchPronunciationHints } = require("./voice-pronunciation");

/**
 * Ponctuation légère — trop de virgules = pauses robot entre chaque mot.
 */
function naturalizeFrenchCasual(text) {
  let out = String(text || "").trim();
  if (!out) return out;

  if (/^ouais\b/i.test(out) && !/^ouais,/i.test(out)) {
    out = out.replace(/^ouais\b/i, "Ouais,");
  }

  if (!/[.?!…]$/.test(out)) {
    out += ".";
  }

  return out;
}

/**
 * Prépare le texte pour Fish : prononciation + ponctuation naturelle.
 * displayText reste le texte utilisateur (historique / UI).
 */
function humanizeVoiceScript(rawText, options = {}) {
  const displayText = String(rawText || "").trim();
  const voiceName = options.voiceName || null;

  if (!displayText) {
    return { displayText: "", fishText: "", humanized: false, pronunciationFixed: false };
  }

  const beforePron = displayText;
  let fishText = applyFrenchPronunciationHints(displayText, { voiceName });
  const pronunciationFixed = fishText !== beforePron;
  fishText = naturalizeFrenchCasual(fishText);
  const humanized = fishText !== beforePron;

  return {
    displayText,
    fishText: fishText.slice(0, 2000),
    humanized,
    pronunciationFixed,
  };
}

module.exports = {
  humanizeVoiceScript,
  naturalizeFrenchCasual,
};
