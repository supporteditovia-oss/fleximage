/**
 * Wrap free-prompt edits so Nano Banana 2 keeps identity/pose/skin
 * unless the user explicitly asks to change them, and luxury logos
 * (Rolex, etc.) stay sharp and correctly spelled.
 */
const IDENTITY_GUARD =
  "IMAGE EDIT ONLY of the uploaded reference photo (not a new person). " +
  "LOCK identity and pose unless the user explicitly asks to change them: " +
  "same face, same head, same hair, same age, same gender presentation, " +
  "identical skin tone and ethnicity (never change white↔black or darken/lighten skin), " +
  "same body proportions, hands, and nails, " +
  "same posture and position (if sitting, stay sitting; if standing, stay standing; same limb placement), " +
  "same camera angle, framing, and crop. " +
  "Do not invent body parts that are cropped out. " +
  "Change ONLY what the user requests (e.g. add a Rolex, change the background/store scene) while keeping the person locked. " +
  "User request:";

/** Photoreal luxury logos/text — critical for watch / flex niche. */
const LUXURY_DETAIL_GUARD =
  "LUXURY DETAIL QUALITY (mandatory): brand names and dial text must be perfectly readable and correctly spelled " +
  "(Rolex = R-O-L-E-X with every letter present and sharp). " +
  "No gibberish text, no missing letters, no warped/melted fonts, no burnt or overexposed dial, no fake symbols. " +
  "Watch crown, bezel, hands, indices, and date window must look like a real high-end product photo — crisp metal, clean reflections, photorealistic.";

const LUXURY_DETAIL_RE =
  /\b(rolex|cartier|patek|audemars|ap\b|omega|breitling|hublot|tag\s*heuer|richard\s*mille|iwc|jaeger|montre|watch|wristwatch|vuitton|louis\s*vuit|gucci|herm[eè]s|chanel|dior|balenciaga|prada|fendi|rolex|submariner|daytona|datejust)\b/i;

const MAX_FINAL_PROMPT = 1900;

function sanitizeUserPrompt(prompt) {
  return String(prompt || "")
    .trim()
    .replace(/tanas?|92i/gi, "jolies filles");
}

function needsLuxuryDetailGuard(prompt) {
  return LUXURY_DETAIL_RE.test(prompt);
}

function joinPromptParts(parts) {
  const combined = parts.filter(Boolean).join(" ");
  if (combined.length <= MAX_FINAL_PROMPT) return combined;

  // Keep guards intact; trim the user request in the middle.
  const [guard, userPart, luxury] = parts;
  const fixedLen =
    (guard ? guard.length + 1 : 0) + (luxury ? luxury.length + 1 : 0);
  const budget = Math.max(120, MAX_FINAL_PROMPT - fixedLen);
  const trimmedUser = String(userPart || "").slice(0, budget);
  return [guard, trimmedUser, luxury].filter(Boolean).join(" ");
}

function buildIdentityPreservingPrompt(userPrompt) {
  const cleaned = sanitizeUserPrompt(userPrompt);
  if (!cleaned) return cleaned;

  const luxury = needsLuxuryDetailGuard(cleaned) ? LUXURY_DETAIL_GUARD : "";
  return joinPromptParts([IDENTITY_GUARD, cleaned, luxury]);
}

module.exports = {
  buildIdentityPreservingPrompt,
  sanitizeUserPrompt,
  needsLuxuryDetailGuard,
  IDENTITY_GUARD,
  LUXURY_DETAIL_GUARD,
  MAX_FINAL_PROMPT,
};
