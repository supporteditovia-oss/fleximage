/**
 * Corrige les prénoms / noms de scène mal lus par le TTS français.
 * displayText = texte utilisateur inchangé ; fishText = version à lire par Fish.
 * Pas de tirets : ils forcent une lecture syllabe par syllabe (effet robot).
 */

/** @type {{ match: RegExp; speak: string }[]} */
const PRONUNCIATION_ENTRIES = [
  { match: /\bKaaris\b/giu, speak: "Karisse" },
  { match: /\bMédine\b/giu, speak: "Médine" },
  { match: /\bMedine\b/giu, speak: "Médine" },
  { match: /\bDamso\b/giu, speak: "Damso" },
  { match: /\bMaes\b/giu, speak: "Mèss" },
  { match: /\bBooba\b/giu, speak: "Bouba" },
  { match: /\bNinho\b/giu, speak: "Ninyo" },
  { match: /\bNiska\b/giu, speak: "Nisska" },
  { match: /\bGazo\b/giu, speak: "Gazo" },
  { match: /\bPLK\b/g, speak: "PéLéKa" },
  { match: /\bSCH\b/g, speak: "EssCéAsh" },
  { match: /\bSDM\b/g, speak: "EssDéEm" },
  { match: /\bKLM\b/g, speak: "KaLéEm" },
  { match: /\bTiakola\b/giu, speak: "Tiakola" },
  { match: /\bWerenoi\b/giu, speak: "Werénoi" },
  { match: /\bBadBad\b/giu, speak: "Bad Bad" },
  { match: /\bMaître Gims\b/giu, speak: "Maître Djims" },
  { match: /\bGims\b/giu, speak: "Djims" },
  { match: /\bJul\b/g, speak: "Jul" },
  { match: /\bDadju\b/giu, speak: "Dadju" },
  { match: /\bAya Nakamura\b/giu, speak: "Aya Nakamoura" },
  { match: /\bMbappé\b/giu, speak: "Mbappé" },
  { match: /\bMbappe\b/giu, speak: "Mbappé" },
  { match: /\bTravis Scott\b/giu, speak: "Travis Scotte" },
  { match: /\bCentral Cee\b/giu, speak: "Central Cí" },
  { match: /\bSqueezie\b/giu, speak: "Squeezi" },
  { match: /\bMacron\b/giu, speak: "Macron" },
  { match: /\bHanouna\b/giu, speak: "Hanouna" },
];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {string} text
 * @param {{ voiceName?: string | null }} [options]
 */
function applyFrenchPronunciationHints(text, options = {}) {
  let out = String(text || "");

  for (const entry of PRONUNCIATION_ENTRIES) {
    out = out.replace(entry.match, entry.speak);
  }

  const voiceName = typeof options.voiceName === "string" ? options.voiceName.trim() : "";
  if (voiceName.length >= 2) {
    const voiceEntry = PRONUNCIATION_ENTRIES.find((entry) =>
      entry.match.test(voiceName),
    );
    if (voiceEntry) {
      const generic = new RegExp(`\\b${escapeRegExp(voiceName)}\\b`, "giu");
      out = out.replace(generic, voiceEntry.speak);
    }
  }

  return out;
}

module.exports = {
  applyFrenchPronunciationHints,
  PRONUNCIATION_ENTRIES,
};
