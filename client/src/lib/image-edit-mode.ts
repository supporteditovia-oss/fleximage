/** Client-side image edit mode — mirrors api/_lib/background-edit-guard.js heuristics. */

export type ImageEditMode = "auto" | "edit" | "create";

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function isBackgroundChangeIntent(prompt: string): boolean {
  const text = normalize(prompt);
  const decor =
    /\b(fond|background|decor|d[eé]cor|arriere[\s-]?plan|backdrop|wallpaper|ciel|sky|ambiance|atmosphere|eclairage|lighting)\b/.test(
      text,
    );
  const place =
    /\b(rooftop|terrasse|terrace|hotel|h[oô]tel|palace|palais|marina|plage|beach|restaurant|dubai|monaco|paris|london|madrid|barcelone|barcelona)\b/.test(
      text,
    );
  const changeVerb =
    /\b(change|changer|remplace|replace|swap|mets|mettre|put|place|teleporte|envoie|emmene|nouveau|new|modifier|modifie|edit)\b/.test(
      text,
    );
  return (
    (decor && changeVerb) ||
    (place && changeVerb) ||
    /\b(change\s+(le\s+)?fond|nouveau\s+d[eé]cor|remplace\s+l['']?arriere[\s-]?plan|replace\s+(the\s+)?background)\b/.test(
      text,
    )
  );
}

export function isExplicitMultiPersonPreservePrompt(prompt: string): boolean {
  const text = normalize(prompt);
  return (
    /\b(garde\s+(les\s+)?(personnes|gens|tout\s+le\s+monde)|keep\s+(all\s+)?(people|everyone|them)|ne\s+(change|modifie)\s+pas\s+(les\s+)?visages?)\b/.test(
      text,
    ) ||
    /\b(mets[\s-]?les|met[\s-]?les|place[\s-]?les|les\s+deux|ensemble|together|avec\s+(cris|ronaldo|mbappe|messi))\b/.test(
      text,
    )
  );
}

/** Suggest edit mode when user has a photo and asks for backdrop/decor change. */
export function suggestImageEditMode(
  prompt: string,
  hasReferenceImage: boolean,
): ImageEditMode {
  if (!hasReferenceImage) return "create";
  if (isExplicitMultiPersonPreservePrompt(prompt) || isBackgroundChangeIntent(prompt)) {
    return "edit";
  }
  return "auto";
}

export const AI_MODIFIED_LABEL = "Image générée/modifiée par IA";

export const IMAGE_EDIT_MODE_LABELS = {
  edit: {
    title: "Modifier mon image",
    hint: "Garde les personnes, change le décor ou l'ambiance.",
  },
  create: {
    title: "Créer une nouvelle image",
    hint: "Génération libre à partir de ton prompt.",
  },
  auto: {
    title: "Automatique",
    hint: "Détecte selon ton prompt.",
  },
} as const;
