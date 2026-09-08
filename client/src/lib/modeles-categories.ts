/**
 * Taxonomie catalogue modèles LuxeFlexIA — images exclusives générées in-house.
 */

export const MODELES_CATEGORIES = [
  {
    slug: "destinations",
    emoji: "🌴",
    label: "Lifestyle",
    description: "Voyage premium — Paris, Prague, Capri, Marrakech et destinations iconiques.",
    coverImagePath: "/models/modele-prague-capri-apres.webp",
    order: 1,
  },
  {
    slug: "jets",
    emoji: "✈️",
    label: "Jets & Vol",
    description: "Business class, jets privés et cabines premium.",
    coverImagePath: "/models/modele-avion-business.webp",
    order: 2,
  },
  {
    slug: "celebrites",
    emoji: "⭐",
    label: "Célébrités",
    description: "Scènes avec figures publiques — modèles exclusifs LuxeFlexIA.",
    coverImagePath: "/models/modele-lamborghini-urus.webp",
    order: 4,
  },
  {
    slug: "supercars",
    emoji: "🚗",
    label: "Supercars",
    description: "Lamborghini, Urus et supercars de légende.",
    coverImagePath: "/models/modele-lamborghini-urus.webp",
    order: 5,
  },
  {
    slug: "yacht",
    emoji: "🛥️",
    label: "Yacht",
    description: "Ponts en teck, mer turquoise et yachting de luxe.",
    coverImagePath: "/models/modele-yacht-deck.webp",
    order: 6,
  },
  {
    slug: "moto",
    emoji: "🏍️",
    label: "Moto",
    description: "Scooters, motos, quads et deux-roues premium.",
    coverImagePath: "/models/modele-scooter-urban.webp",
    order: 7,
  },
  {
    slug: "pranks",
    emoji: "😂",
    label: "Pranks",
    description: "Scènes prank et setups crédibles pour surprendre.",
    coverImagePath: "/models/modele-quad-dubai-ready.webp",
    order: 8,
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
  lifestyle: "destinations",
  celebrites: "celebrites",
  destinations: "destinations",
  pays: "destinations",
  destination: "destinations",
  voyages: "destinations",
  voyage: "destinations",
  jets: "jets",
  jet: "jets",
  avion: "jets",
  aviation: "jets",
  pranks: "pranks",
  supercars: "supercars",
  moto: "moto",
  yacht: "yacht",
  outfits: "destinations",
  adrenaline: "supercars",
  dubai: "supercars",
  paris: "destinations",
  marrakech: "destinations",
  monaco: "destinations",
  "tokyo-istanbul": "destinations",
  "travel-tourism": "destinations",
  streetwear: "destinations",
  luxury: "destinations",
  "luxury-lifestyle": "destinations",
};

export function normalizeSceneCategory(
  category: string | undefined | null,
): ModelesCategorySlug {
  const key = String(category || "").trim().toLowerCase();
  return LEGACY_SCENE_CATEGORY_MAP[key] ?? "destinations";
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
    const normalizedSlug = normalizeSceneCategory(slug);
    if (getCategoryBySlug(normalizedSlug)) {
      return {
        view: "category",
        categorySlug: normalizedSlug,
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

/** Identifiant stable pour l’URL fiche modèle (toujours l’id, jamais ambigu). */
export function getTemplateRouteId(template: {
  id: string;
  slug?: string | null;
}): string {
  return template.id;
}

export function modelesDetailPath(template: { id: string; slug?: string | null }) {
  return `/modeles/m/${encodeURIComponent(getTemplateRouteId(template))}`;
}

export function findTemplateByRouteKey(
  templates: { id: string; slug?: string | null }[],
  routeKey: string | null | undefined,
): (typeof templates)[number] | undefined {
  if (!routeKey) return undefined;
  const key = decodeURIComponent(routeKey);
  return templates.find((item) => item.id === key || item.slug === key);
}
