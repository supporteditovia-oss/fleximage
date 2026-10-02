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
 * Message vocal continu — évite les pauses Fish entre phrases courtes.
 * Les « . » internes deviennent des virgules ; une seule fin de phrase.
 */
function flowFrenchVocalDelivery(text) {
  let out = String(text || "").trim();
  if (!out) return out;

  out = out.replace(/[\r\n]+/g, " ");
  out = out.replace(/\s+/g, " ");
  out = out.replace(/\.{3,}/g, "…");
  out = out.replace(/…+/g, "…");

  const terminal = out.match(/[.?!…]$/)?.[0] || "";
  let body = terminal ? out.slice(0, -1).trim() : out;

  body = body
    .replace(/\.\s+/g, ", ")
    .replace(/!\s+/g, ", ")
    .replace(/\?\s+/g, ", ")
    .replace(/…\s+/g, ", ")
    .replace(/;\s+/g, ", ")
    .replace(/:\s+/g, ", ");

  body = body.replace(/,\s*,+/g, ", ").replace(/^,\s*/, "").trim();

  out = body;
  if (terminal && terminal !== ".") {
    out = `${out}${terminal}`;
  } else if (out && !/[.?!…]$/.test(out)) {
    out += ".";
  }

  return out;
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

  const humanizeExtras = options.enabled !== false;

  let fishText = displayText;
  let pronunciationFixed = false;
  if (humanizeExtras) {
    fishText = expandFrenchChatShorthand(fishText);
    const afterExpand = fishText;
    fishText = applyFrenchPronunciationHints(fishText, { voiceName });
    pronunciationFixed = fishText !== afterExpand;
    fishText = naturalizeFrenchCasual(fishText);
  } else {
    fishText = fishText.replace(/\s+/g, " ").trim();
  }

  /** Toujours — catalogue, clone perso, extrait inline (Fish msgpack). */
  fishText = flowFrenchVocalDelivery(fishText);
  const humanized = fishText !== displayText;

  return {
    displayText,
    fishText: fishText.slice(0, 2000),
    humanized,
    pronunciationFixed,
  };
}

/** Texte final Fish — même règles pour toutes les voix (rappeurs catalogue + clones). */
function prepareVoiceTtsForFish(rawText, options = {}) {
  return humanizeVoiceScript(rawText, { enabled: true, ...options }).fishText;
}

module.exports = {
  humanizeVoiceScript,
  prepareVoiceTtsForFish,
  naturalizeFrenchCasual,
  expandFrenchChatShorthand,
  polishFrenchCasualFlow,
  flowFrenchVocalDelivery,
};
