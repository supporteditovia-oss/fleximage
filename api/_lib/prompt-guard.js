/**
 * Wrap free-prompt edits so the model keeps the person's body/skin
 * and does not invent limbs that are not in the reference photo.
 */
const IDENTITY_GUARD =
  "Edit the uploaded reference photo only. Keep the exact same person: identical skin tone, skin texture, freckles, hand shape, nails, veins, and body details — do not change ethnicity or skin color. Do not invent body parts that are not visible in the photo (if feet/legs are cropped out, keep them out). Keep the same camera angle, framing, and crop. Apply only the requested changes:";

const MAX_FINAL_PROMPT = 1900;

function sanitizeUserPrompt(prompt) {
  return String(prompt || "")
    .trim()
    .replace(/tanas?|92i/gi, "jolies filles");
}

function buildIdentityPreservingPrompt(userPrompt) {
  const cleaned = sanitizeUserPrompt(userPrompt);
  if (!cleaned) return cleaned;

  const combined = `${IDENTITY_GUARD} ${cleaned}`;
  if (combined.length <= MAX_FINAL_PROMPT) return combined;

  const budget = Math.max(200, MAX_FINAL_PROMPT - IDENTITY_GUARD.length - 1);
  return `${IDENTITY_GUARD} ${cleaned.slice(0, budget)}`;
}

module.exports = {
  buildIdentityPreservingPrompt,
  sanitizeUserPrompt,
};
