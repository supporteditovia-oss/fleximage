import catalog from "@shared/builtin-outfit-templates.json";

export type BuiltinOutfit = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imagePath: string;
  category: string;
  categoryName: string;
};

export const BUILTIN_OUTFITS = catalog as BuiltinOutfit[];

/** Texte inséré automatiquement quand l'utilisateur choisit un outfit (image 1 = personne). */
export const OUTFIT_PROMPT_SNIPPET = "Remplace ma tenue par l'image 2.";

export function findBuiltinOutfit(idOrSlug: string): BuiltinOutfit | undefined {
  return BUILTIN_OUTFITS.find(
    (item) => item.id === idOrSlug || item.slug === idOrSlug,
  );
}

export function appendOutfitPrompt(currentPrompt: string): string {
  const trimmed = currentPrompt.trim();
  const hasOutfitRef =
    /\b(image|photo)\s*2\b/i.test(trimmed) &&
    /\b(tenue|outfit|habits|vetement|vêtement|clothes)\b/i.test(trimmed);
  if (hasOutfitRef) return trimmed;
  if (!trimmed) return OUTFIT_PROMPT_SNIPPET;
  return `${OUTFIT_PROMPT_SNIPPET} ${trimmed}`;
}

export function replaceOutfitPrompt(currentPrompt: string): string {
  const trimmed = currentPrompt.trim();
  const withoutOld = trimmed
    .replace(
      /^Remplace ma tenue par l['']image 2\.?\s*/i,
      "",
    )
    .trim();
  if (!withoutOld) return OUTFIT_PROMPT_SNIPPET;
  return `${OUTFIT_PROMPT_SNIPPET} ${withoutOld}`;
}
