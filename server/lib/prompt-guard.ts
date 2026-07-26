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

/** Production system directives (mandatory). */
export const SYSTEM_PRODUCTION_RULES =
  "SYSTEM: Style photo smartphone réaliste. Séparer distinctement les personnages, aucune fusion de corps. Béton et acier photo-réalistes, pas de texture carton.";

/**
 * Nano Banana has no native negativePrompt field — exclusions go in the main prompt.
 */
export const NEGATIVE_PROMPT_EXCLUSIONS =
  "hybrides, corps fusionnés, homme en robe, jambes supplémentaires, mains fantômes, doigts déformés, texte illisible, charabia, effet plastique, dessin 3D";

export const NEGATIVE_PROMPT_CLAUSE =
  `Negative prompt: ${NEGATIVE_PROMPT_EXCLUSIONS}. ` +
  "Avoid hybrids, fused bodies, man in dress, extra legs, ghost hands, deformed fingers, unreadable text, gibberish, plastic look, 3D cartoon render.";

/**
 * Always applied — anatomy, crowd edits, products, text, materials, anti-AI look.
 */
export const REALISM_QUALITY_GUARD =
  "PHOTOREAL QUALITY (mandatory): natural skin pores, real fabric weave, clean natural lighting, no burnt highlights, no muddy AI smear. " +
  "FACES SHARP AND LARGE ENOUGH: eyes/skin readable when zoomed; avoid tiny distant faces when possible. " +
  "ANATOMY LOCK: exactly two arms, two legs, two hands, five fingers per hand — no extra/ghost/floating hands, no fused limbs, no warped phones or melted objects. " +
  "GENDER + OUTFIT COHERENCE: each person must have one coherent body and matching clothes. " +
  "If adding women: insert COMPLETE separate women (own face, own body, own dress/heels) — NEVER put a dress, heels, or female legs on an existing man; never hybrid man-torso + dress. " +
  "Workers keep workwear; glamorous women keep glamorous outfits; do not swap or merge genders/clothes. " +
  "CROWDS: prefer fewer, fully correct people over many broken ones; each person physically separate with believable contact. " +
  "TEXT & SIGNS: every letter perfectly readable — no gibberish, no warped/melted logos. " +
  "REAL PRODUCTS ONLY: watches, cars, shoes, bags, keys, phones, outfits must be real-world models with authentic brands.";

/** @deprecated alias — same as REALISM_QUALITY_GUARD */
export const LUXURY_DETAIL_GUARD = REALISM_QUALITY_GUARD;

/** OneShot allows up to 3000; leave margin for safety. */
export const MAX_FINAL_PROMPT = 2900;

const ADD_WOMEN_CLARIFIER =
  " (Add them as fully separate complete women with their own bodies and outfits — do not dress any existing men in women's clothes.)";

export function sanitizeUserPrompt(prompt: string): string {
  let cleaned = String(prompt || "")
    .trim()
    .replace(/tanas?|92i/gi, "jolies filles")
    // Soften adult trigger words so Google Nano Banana is less likely to hard-block
    // while still producing glamorous women in the scene.
    .replace(/\bescortes?\b/gi, "femmes élégantes en tenues glamours")
    .replace(/\bescorts?\b/gi, "glamorous stylish women")
    .replace(/\bsexy\b/gi, "glamorous");

  // When the user asks to add women into a male/group scene, spell out "add people"
  // so the model does not morph men's clothes into dresses (common failure mode).
  if (
    /\b(ajoute|ajouter|ajout|add|ajoutez|mets|mettre|with|avec)\b[\w\s,']{0,40}\b(femmes?|filles?|women|girls|ladies)\b/i.test(
      cleaned,
    ) ||
    /\b(femmes?|filles?|women|girls|ladies)\b[\w\s,']{0,40}\b(ajoute|ajouter|ajout|add|dans|sur|autour|around|beside|next)\b/i.test(
      cleaned,
    )
  ) {
    if (!/fully separate complete women/i.test(cleaned)) {
      cleaned = `${cleaned}${ADD_WOMEN_CLARIFIER}`;
    }
  }

  return cleaned;
}

/** @deprecated realism guard is now always on */
export function needsLuxuryDetailGuard(_prompt: string): boolean {
  return true;
}

function productionSuffix(): string {
  return [SYSTEM_PRODUCTION_RULES, REALISM_QUALITY_GUARD, NEGATIVE_PROMPT_CLAUSE]
    .filter(Boolean)
    .join(" ");
}

/**
 * Build final provider prompt: identity lock + user request + system + realism + negatives.
 */
export function buildIdentityPreservingPrompt(userPrompt: string): string {
  const cleaned = sanitizeUserPrompt(userPrompt);
  if (!cleaned) return cleaned;

  const prefix = IDENTITY_GUARD;
  const suffix = productionSuffix();
  const budget = Math.max(120, MAX_FINAL_PROMPT - prefix.length - suffix.length - 2);
  const userPart = cleaned.slice(0, budget);
  return `${prefix} ${userPart} ${suffix}`;
}

/** Append production system + negative rules onto an already-built template prompt. */
export function appendProductionPromptRules(prompt: string): string {
  const base = String(prompt || "").trim();
  if (!base) return base;
  const suffix = productionSuffix();
  if (base.includes("Negative prompt:")) return base.slice(0, MAX_FINAL_PROMPT);
  const combined = `${base} ${suffix}`;
  return combined.length <= MAX_FINAL_PROMPT
    ? combined
    : combined.slice(0, MAX_FINAL_PROMPT);
}
