/**
 * Wrap free-prompt edits so Nano Banana 2 keeps identity/pose/skin
 * unless the user explicitly asks to change them.
 * Keep in sync with api/_lib/prompt-guard.js (Vercel).
 */
export const IDENTITY_GUARD =
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

export const MAX_FINAL_PROMPT = 1900;

export function sanitizeUserPrompt(prompt: string): string {
  return String(prompt || "")
    .trim()
    .replace(/tanas?|92i/gi, "jolies filles");
}

export function buildIdentityPreservingPrompt(userPrompt: string): string {
  const cleaned = sanitizeUserPrompt(userPrompt);
  if (!cleaned) return cleaned;

  const combined = `${IDENTITY_GUARD} ${cleaned}`;
  if (combined.length <= MAX_FINAL_PROMPT) return combined;

  const budget = Math.max(200, MAX_FINAL_PROMPT - IDENTITY_GUARD.length - 1);
  return `${IDENTITY_GUARD} ${cleaned.slice(0, budget)}`;
}
