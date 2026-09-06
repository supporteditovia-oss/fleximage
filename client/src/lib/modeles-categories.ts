/**
 * Taxonomie catalogue modèles LuxeFlexIA — images exclusives générées in-house.
 */

export const MODELES_CATEGORIES = [
  {
    slug: "lifestyle",
    emoji: "🌴",
    label: "Lifestyle",
    description: "Streetwear, flex urbain et moments premium du quotidien.",
    coverImagePath: "/models/modele-scooter-urban.webp",
    order: 1,
  },
  {
    slug: "celebrites",
    emoji: "⭐",
    label: "Célébrités",
    description: "Scènes avec figures publiques — modèles exclusifs LuxeFlexIA.",
    coverImagePath: "/models/modele-lamborghini-urus.webp",
    order: 2,
  },
  {
    slug: "voyages",
    emoji: "✈️",
    label: "Voyages",
    description: "Jets, destinations et horizons de luxe.",
    coverImagePath: "/models/modele-avion-business.webp",
    order: 3,
  },
  {
    slug: "supercars",
    emoji: "🚗",
    label: "Supercars",
    description: "Lamborghini, Urus et supercars de légende.",
    coverImagePath: "/models/modele-lamborghini-urus.webp",
    order: 4,
  },
  {
    slug: "yacht",
    emoji: "🛥️",
    label: "Yacht",
    description: "Ponts en teck, mer turquoise et yachting de luxe.",
    coverImagePath: "/models/modele-yacht-deck.webp",
    order: 5,
  },
  {
    slug: "moto",
    emoji: "🏍️",
    label: "Moto",
    description: "Scooters, motos, quads et deux-roues premium.",
    coverImagePath: "/models/modele-scooter-urban.webp",
    order: 6,
  },
  {
    slug: "pranks",
    emoji: "😂",
    label: "Pranks",
    description: "Scènes prank et setups crédibles pour surprendre.",
    coverImagePath: "/models/modele-quad-dubai-ready.webp",
    order: 7,
  },
] as const;

/** Catégories visibles dans le catalogue (scènes uniquement, pas les tenues). */
export function getCatalogCategories() {
  return MODELES_CATEGORIES;
}

export type ModelesCategorySlug = (typeof MODELES_CATEGORIES)[number]["slug"];

export type ModelesCategory = (typeof MODELES_CATEGORIES)[number];

/** Anciennes catégories JSON → nouvelle taxonomie. */
const LEGACY_SCENE_CATEGORY_MAP: Record<string, ModelesCategorySlug> = {
  lifestyle: "lifestyle",
  celebrites: "celebrites",
  voyages: "voyages",
  pranks: "pranks",
  supercars: "supercars",
  moto: "moto",
  yacht: "yacht",
  outfits: "lifestyle",
  adrenaline: "supercars",
  dubai: "lifestyle",
  "tokyo-istanbul": "voyages",
  "travel-tourism": "voyages",
  streetwear: "lifestyle",
  luxury: "lifestyle",
  "luxury-lifestyle": "lifestyle",
};

export function normalizeSceneCategory(
  category: string | undefined | null,
): ModelesCategorySlug {
  const key = String(category || "").trim().toLowerCase();
  return LEGACY_SCENE_CATEGORY_MAP[key] ?? "lifestyle";
}

export function getCategoryBySlug(slug: string): ModelesCategory | undefined {
  return MODELES_CATEGORIES.find((cat) => cat.slug === slug);
}

export function getCategoryLabel(slug: ModelesCategorySlug): string {
  const cat = getCategoryBySlug(slug);
  return cat ? `${cat.emoji} ${cat.label}` : slug;
}

/** Ancienne catégorie outfits — rediriger vers le catalogue. */
export function isOutfitCategory(slug: string): boolean {
  return slug === "outfits";
}

export function formatSceneCount(count: number): string {
  if (count <= 0) return "Bientôt";
  return count === 1 ? "1 scène" : `${count} scènes`;
}

/** Parse le chemin /modeles, /modeles/c/:cat, /modeles/m/:slug */
export function parseModelesPath(pathname: string): {
  view: "home" | "category" | "detail";
  categorySlug: ModelesCategorySlug | null;
  templateSlug: string | null;
} {
  const path = pathname.replace(/\/+$/, "") || "/modeles";

  const detailMatch = path.match(/^\/modeles\/m\/([^/]+)$/);
  if (detailMatch) {
    return {
      view: "detail",
      categorySlug: null,
      templateSlug: decodeURIComponent(detailMatch[1]),
    };
  }

  const categoryMatch = path.match(/^\/modeles\/c\/([^/]+)$/);
  if (categoryMatch) {
    const slug = decodeURIComponent(categoryMatch[1]);
    if (isOutfitCategory(slug)) {
      return { view: "home", categorySlug: null, templateSlug: null };
    }
    if (getCategoryBySlug(slug)) {
      return {
        view: "category",
        categorySlug: slug as ModelesCategorySlug,
        templateSlug: null,
      };
    }
  }

  if (path === "/modeles") {
    return { view: "home", categorySlug: null, templateSlug: null };
  }

  return { view: "home", categorySlug: null, templateSlug: null };
}

export const MODELES_CATALOG_PATH = "/modeles";
export const modelesCategoryPath = (slug: ModelesCategorySlug) =>
  `/modeles/c/${slug}`;
export const modelesDetailPath = (templateSlug: string) =>
  `/modeles/m/${templateSlug}`;
