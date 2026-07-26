/**
 * Adult / hardcore content policy for LuxeFlexIA.
 * Lifestyle "sexy/glamorous" flex is OK; nude/porn/hardcore is blocked.
 */

const CONTENT_POLICY_CODE = "PROMPT_POLICY_VIOLATION";

const CONTENT_POLICY_MESSAGE_FR =
  "Le contenu demandé n'est pas autorisé. Les images à caractère pornographique, de nudité ou explicite sont interdites sur LuxeFlexIA. Reformule ta demande. Aucun jeton n'est perdu.";

const CONTENT_POLICY_MESSAGE_FR_SHORT =
  "Contenu non autorisé (nudité / explicite). Reformule ta demande — aucun jeton n'est perdu.";

/** Hard-block patterns (FR + EN). Keep glamorous "sexy" lifestyle outside this list. */
const DISALLOWED_ADULT_RE =
  /\b(nude|naked|nudee|nudit[eé]|nue\b|nus\b|a\s*poils?|topless|bottomless|sans\s*v[eê]tements?|d[eé]shabill[eé]e?s?|porn|porno|pornograph|xxx|nsfw|hardcore|hentai|onlyfans\s*nude|sexe\s*explicite|sex\s*explicit|fellatio|sodomie|p[eé]n[eé]tration|vagin|p[eé]nis|seins?\s*nus|nichons|bite\b|couilles|chattes?\b|cumshot|orgasm|masturb)/i;

function normalizePolicyText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isDisallowedAdultPrompt(prompt) {
  const text = normalizePolicyText(prompt);
  if (!text) return false;
  return DISALLOWED_ADULT_RE.test(text);
}

function contentPolicyResponse() {
  return {
    code: CONTENT_POLICY_CODE,
    message: CONTENT_POLICY_MESSAGE_FR,
  };
}

module.exports = {
  CONTENT_POLICY_CODE,
  CONTENT_POLICY_MESSAGE_FR,
  CONTENT_POLICY_MESSAGE_FR_SHORT,
  isDisallowedAdultPrompt,
  contentPolicyResponse,
};
