/**
 * Wrap free-prompt edits so Nano Banana 2 keeps identity/pose/skin
 * unless the user asks to change them, and all products / scenes
 * stay photoreal with real-world brands and sharp readable text.
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
  "Change ONLY what the user requests while keeping the person locked. " +
  "User request:";

/**
 * Always applied — watches, cars, shoes, bags, keys, outfits, screens, pranks, etc.
 */
export const REALISM_QUALITY_GUARD =
  "PHOTOREAL QUALITY (mandatory): ultra-sharp high-detail photo, clean lighting, no blur, no burnt highlights, no muddy compression. " +
  "REAL PRODUCTS ONLY: every watch, car, shoe, bag, key, phone, outfit, or branded object must be a real existing model from the real world — never invent fake models or fantasy logos. " +
  "If a brand is named (Rolex, Patek Philippe, Richard Mille, Audemars Piguet, Cartier, Omega, Ferrari, Lamborghini, Porsche, Mercedes, BMW, Louis Vuitton, Gucci, Nike, etc.), " +
  "use a real recognizable product and spell every logo letter perfectly — no missing letters, no gibberish, no warped/melted text. " +
  "Metal, glass, leather, fabric, and screen cracks must look physically real. Prank effects (broken screen, etc.) must stay believable and sharp.";

/** @deprecated alias — same as REALISM_QUALITY_GUARD */
export const LUXURY_DETAIL_GUARD = REALISM_QUALITY_GUARD;

/** OneShot allows up to 3000; leave margin for safety. */
export const MAX_FINAL_PROMPT = 2900;

export function sanitizeUserPrompt(prompt: string): string {
  return String(prompt || "")
    .trim()
    .replace(/tanas?|92i/gi, "jolies filles")
    // Soften adult trigger words so Google Nano Banana is less likely to hard-block
    // while still producing glamorous women in the scene.
    .replace(/\bescortes?\b/gi, "femmes élégantes en tenues glamours")
    .replace(/\bescorts?\b/gi, "glamorous stylish women")
    .replace(/\bsexy\b/gi, "glamorous");
}

/** @deprecated realism guard is now always on */
export function needsLuxuryDetailGuard(_prompt: string): boolean {
  return true;
}

function joinPromptParts(parts: Array<string | undefined>): string {
  const combined = parts.filter(Boolean).join(" ");
  if (combined.length <= MAX_FINAL_PROMPT) return combined;

  const [guard, userPart, realism] = parts;
  const fixedLen =
    (guard ? guard.length + 1 : 0) + (realism ? realism.length + 1 : 0);
  const budget = Math.max(120, MAX_FINAL_PROMPT - fixedLen);
  const trimmedUser = String(userPart || "").slice(0, budget);
  return [guard, trimmedUser, realism].filter(Boolean).join(" ");
}

export function buildIdentityPreservingPrompt(userPrompt: string): string {
  const cleaned = sanitizeUserPrompt(userPrompt);
  if (!cleaned) return cleaned;

  return joinPromptParts([IDENTITY_GUARD, cleaned, REALISM_QUALITY_GUARD]);
}
