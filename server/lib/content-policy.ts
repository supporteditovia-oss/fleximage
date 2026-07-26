/**
 * Adult / hardcore content policy for LuxeFlexIA.
 * Lifestyle "sexy/glamorous" flex is OK; nude/porn/hardcore is blocked.
 * Keep in sync with api/_lib/content-policy.js
 */

export const CONTENT_POLICY_CODE = "PROMPT_POLICY_VIOLATION";

export const CONTENT_POLICY_MESSAGE_FR =
  "Le contenu demandé n'est pas autorisé. Les images à caractère pornographique, de nudité ou explicite sont interdites sur LuxeFlexIA. Reformule ta demande. Aucun jeton n'est perdu.";

export const CONTENT_POLICY_MESSAGE_FR_SHORT =
  "Contenu non autorisé (nudité / explicite). Reformule ta demande — aucun jeton n'est perdu.";

const DISALLOWED_ADULT_RE =
  /\b(nude|naked|nudee|nudit[eé]|nue\b|nus\b|a\s*poils?|topless|bottomless|sans\s*v[eê]tements?|d[eé]shabill[eé]e?s?|porn|porno|pornograph|xxx|nsfw|hardcore|hentai|onlyfans\s*nude|sexe\s*explicite|sex\s*explicit|fellatio|sodomie|p[eé]n[eé]tration|vagin|p[eé]nis|seins?\s*nus|nichons|bite\b|couilles|chattes?\b|cumshot|orgasm|masturb)/i;

function normalizePolicyText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function isDisallowedAdultPrompt(prompt: string): boolean {
  const text = normalizePolicyText(prompt);
  if (!text) return false;
  return DISALLOWED_ADULT_RE.test(text);
}

export function contentPolicyResponse() {
  return {
    code: CONTENT_POLICY_CODE,
    message: CONTENT_POLICY_MESSAGE_FR,
  };
}
