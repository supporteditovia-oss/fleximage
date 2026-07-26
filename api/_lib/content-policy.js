/**
 * Content policy for LuxeFlexIA.
 * Adult / hardcore / weapons / cash / drug *depiction* is ALLOWED.
 * Only sexual content involving minors is blocked.
 * Keep in sync with server/lib/content-policy.ts
 */

const CONTENT_POLICY_CODE = "PROMPT_POLICY_VIOLATION";

const CONTENT_POLICY_MESSAGE_FR =
  "Le contenu demandé n'est pas autorisé (protection des mineurs). Reformule ta demande. Aucun jeton n'est perdu.";

const CONTENT_POLICY_MESSAGE_FR_SHORT =
  "Contenu non autorisé (protection des mineurs). Aucun jeton n'est perdu.";

/** Only block sexual content involving minors. Everything else must generate. */
const DISALLOWED_MINOR_SEXUAL_RE =
  /\b((child|children|kid|kids|minor|minors|underage|under[\s-]?age|preteen|pre-teen|loli|shota|enfant|enfants|mineur|mineure|mineurs|ado\b|adolescent[es]?)[\w\s,.-]{0,40}(nude|naked|sex|sexual|porn|nudee|nudit|nue\b|pornograph|xxx|nsfw|viol|rape|pene|penis|vagin|seins|nipple)|((nude|naked|sex|sexual|porn|xxx|nsfw|nue\b)[\w\s,.-]{0,40}(child|children|kid|kids|minor|minors|underage|enfant|enfants|mineur|mineure|loli|shota)))/i;

function normalizePolicyText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** @deprecated name kept for callers — now minors-only, not adult/hardcore. */
function isDisallowedAdultPrompt(prompt) {
  const text = normalizePolicyText(prompt);
  if (!text) return false;
  return DISALLOWED_MINOR_SEXUAL_RE.test(text);
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
