const { applyFrenchPronunciationHints } = require("./voice-pronunciation");

/** Abréviations SMS / chat → mots entiers pour le TTS. */
const CHAT_SHORTHAND = [
  [/\bslt\b/giu, "salut"],
  [/\bbjr\b/giu, "bonjour"],
  [/\bbsr\b/giu, "bonsoir"],
  [/\bcv\b/giu, "ça va"],
  [/\bstp\b/giu, "s'il te plaît"],
  [/\bsvp\b/giu, "s'il vous plaît"],
  [/\bmdr\b/giu, "mdr"],
  [/\bptdr\b/giu, "ptdr"],
  [/\bjsuis\b/giu, "je suis"],
  [/\btkt\b/giu, "t'inquiète"],
  [/\bbcp\b/giu, "beaucoup"],
  [/\bbébé\b/giu, "bébé"],
  [/\bbebe\b/giu, "bébé"],
  [/\bbb\b/giu, "bébé"],
  [/\bjtm\b/giu, "je t'aime"],
];

function expandFrenchChatShorthand(text) {
  let out = String(text || "");
  for (const [pattern, replacement] of CHAT_SHORTHAND) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/** Une seule salutation fluide, pas de double « salut » ni « euh » injecté. */
function polishFrenchCasualFlow(text) {
  let out = String(text || "").trim();
  if (!out) return out;

  out = out.replace(/\s+/g, " ");
  out = out.replace(/^(salut)\s+(salut)\b/giu, "$1");
  out = out.replace(/\beuh\s+salut\b/giu, "salut");
  out = out.replace(/\bsalut\s+euh\b/giu, "salut");

  if (/^salut\b/i.test(out) && !/^salut,/i.test(out)) {
    out = out.replace(/^salut\b/i, "Salut,");
  }
  if (/^bonjour\b/i.test(out) && !/^bonjour,/i.test(out)) {
    out = out.replace(/^bonjour\b/i, "Bonjour,");
  }

  if (!/[.?!…]$/.test(out)) {
    out += ".";
  }

  return out;
}

function naturalizeFrenchCasual(text) {
  return polishFrenchCasualFlow(text);
}

/**
 * Prépare le texte pour Fish : expansions SMS + prononciation + ponctuation naturelle.
 * displayText reste le texte utilisateur (historique / UI).
 */
function humanizeVoiceScript(rawText, options = {}) {
  const displayText = String(rawText || "").trim();
  const voiceName = options.voiceName || null;

  if (!displayText) {
    return { displayText: "", fishText: "", humanized: false, pronunciationFixed: false };
  }

  let fishText = expandFrenchChatShorthand(displayText);
  const afterExpand = fishText;
  fishText = applyFrenchPronunciationHints(fishText, { voiceName });
  const pronunciationFixed = fishText !== afterExpand;
  fishText = naturalizeFrenchCasual(fishText);
  const humanized = fishText !== displayText;

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
  expandFrenchChatShorthand,
  polishFrenchCasualFlow,
};
