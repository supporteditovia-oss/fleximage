/**
 * Content policy for LuxeFlexIA.
 * Adult / hardcore / weapons / cash / drug *depiction* is ALLOWED.
 * Only sexual content involving minors is blocked.
 * Keep in sync with api/_lib/content-policy.js
 */

export const CONTENT_POLICY_CODE = "PROMPT_POLICY_VIOLATION";

export const CONTENT_POLICY_MESSAGE_FR =
  "Le contenu demandé n'est pas autorisé (protection des mineurs). Reformule ta demande. Aucun jeton n'est perdu.";

export const CONTENT_POLICY_MESSAGE_FR_SHORT =
  "Contenu non autorisé (protection des mineurs). Aucun jeton n'est perdu.";

/** Only block sexual content involving minors. Everything else must generate. */
const DISALLOWED_MINOR_SEXUAL_RE =
  /\b((child|children|kid|kids|minor|minors|underage|under[\s-]?age|preteen|pre-teen|loli|shota|enfant|enfants|mineur|mineure|mineurs|ado\b|adolescent[es]?)[\w\s,.-]{0,40}(nude|naked|sex|sexual|porn|nudee|nudit|nue\b|pornograph|xxx|nsfw|viol|rape|pene|penis|vagin|seins|nipple)|((nude|naked|sex|sexual|porn|xxx|nsfw|nue\b)[\w\s,.-]{0,40}(child|children|kid|kids|minor|minors|underage|enfant|enfants|mineur|mineure|loli|shota)))/i;

function normalizePolicyText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** @deprecated name kept for callers — now minors-only, not adult/hardcore. */
export function isDisallowedAdultPrompt(prompt: string): boolean {
  const text = normalizePolicyText(prompt);
  if (!text) return false;
  return DISALLOWED_MINOR_SEXUAL_RE.test(text);
}

export function contentPolicyResponse() {
  return {
    code: CONTENT_POLICY_CODE,
    message: CONTENT_POLICY_MESSAGE_FR,
  };
}
