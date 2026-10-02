const { humanizeVoiceScript } = require("./voice-humanize");

/**
 * Fish TTS lit mal les « AAAAAHHHH » bruts (sons type aboiement).
 * On convertit en ligne parlable pour Avatar Pro.
 */
function prepareI2VVoiceTextForFish(rawText) {
  const raw = String(rawText || "").trim();
  if (!raw) return raw;

  const compact = raw.replace(/\s+/g, "");
  const lettersOnly = compact.replace(/[^a-zàâäéèêëïîôùûüyh]/giu, "");
  const isMostlyVowels =
    lettersOnly.length >= 4 &&
    lettersOnly.length / Math.max(compact.length, 1) >= 0.85;
  const screamShape =
    /^a+h+!*$/iu.test(lettersOnly) ||
    /^h+a+!*$/iu.test(lettersOnly) ||
    /^a+!*$/iu.test(lettersOnly) ||
    (isMostlyVowels && /^[ah!]+$/iu.test(lettersOnly));

  if (screamShape) {
    return "Aaaaah ! Aaaaah ! Non !";
  }

  let normalized = raw.replace(/(.)\1{5,}/giu, (match, ch) => {
    const c = String(ch).toLowerCase();
    if (c === "a") return "Aaaah";
    if (c === "h") return "h";
    if (c === "o") return "Oh";
    if (c === "e") return "Eh";
    return `${ch}${ch}${ch}`;
  });

  return humanizeVoiceScript(normalized).fishText;
}

module.exports = {
  prepareI2VVoiceTextForFish,
};
