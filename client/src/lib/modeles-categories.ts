/**
 * Taxonomie catalogue modèles LuxeFlexIA — images exclusives générées in-house.
 * Conçu pour scaler à 500+ entrées sans images externes.
 */

export const MODELES_CATEGORIES = [
  {
    slug: "lifestyle",
    label: "Lifestyle",
    description: "Streetwear, flex urbain et moments premium du quotidien.",
    order: 1,
  },
  {
    slug: "celebrites",
    label: "Célébrités",
    description: "Scènes avec figures publiques — modèles exclusifs LuxeFlexIA.",
    order: 2,
  },
  {
    slug: "voyages",
    label: "Voyages",
    description: "Yachts, jets, destinations et horizons de luxe.",
    order: 3,
  },
  {
    slug: "pranks",
    label: "Pranks",
    description: "Scènes prank et setups crédibles pour surprendre.",
    order: 4,
  },
  {
    slug: "adrenaline",
    label: "Adrénaline",
    description: "Supercars, quads et sensations fortes.",
    order: 5,
  },
  {
    slug: "outfits",
    label: "Outfits",
    description: "Tenues exclusives LuxeFlexIA pour personnaliser tes modèles.",
    order: 6,
    isOutfitCatalog: true,
  },
] as const;

export type ModelesCategorySlug = (typeof MODELES_CATEGORIES)[number]["slug"];

export type ModelesCategory = (typeof MODELES_CATEGORIES)[number];

/** Anciennes catégories JSON → nouvelle taxonomie. */
const LEGACY_SCENE_CATEGORY_MAP: Record<string, ModelesCategorySlug> = {
  lifestyle: "lifestyle",
  celebrites: "celebrites",
  voyages: "voyages",
  pranks: "pranks",
  adrenaline: "adrenaline",
  outfits: "outfits",
  supercars: "adrenaline",
  "travel-tourism": "voyages",
  streetwear: "lifestyle",
  luxury: "outfits",
  "luxury-lifestyle": "lifestyle",
};

export function normalizeSceneCategory(category: string | undefined | null): ModelesCategorySlug {
  const key = String(category || "").trim().toLowerCase();
  return LEGACY_SCENE_CATEGORY_MAP[key] ?? "lifestyle";
}

export function getCategoryBySlug(slug: string): ModelesCategory | undefined {
  return MODELES_CATEGORIES.find((cat) => cat.slug === slug);
}

export function getCategoryLabel(slug: ModelesCategorySlug): string {
  return getCategoryBySlug(slug)?.label ?? slug;
}

export function isOutfitCategory(slug: ModelesCategorySlug): boolean {
  return slug === "outfits";
}
