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
    slug: "moto",
    emoji: "🏍️",
    label: "Moto",
    description: "Scooters, motos et deux-roues premium.",
    coverImagePath: "/models/modele-scooter-urban.webp",
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
    slug: "outfits",
    emoji: "👔",
    label: "Outfits",
    description: "Tenues exclusives LuxeFlexIA pour personnaliser tes modèles.",
    coverImagePath: "/outfits/outfit-lv-vest-goyard.jpg",
    order: 7,
    isOutfitCatalog: true,
  },
  {
    slug: "pranks",
    emoji: "😂",
    label: "Pranks",
    description: "Scènes prank et setups crédibles pour surprendre.",
    coverImagePath: "/models/modele-quad-dubai-ready.webp",
    order: 8,
  },
  {
    slug: "dubai",
    emoji: "🏙️",
    label: "Dubaï",
    description: "Skyline, Burj Khalifa et nuits dorées à Dubaï.",
    coverImagePath: "/models/modele-urus-dubai-sunset.webp",
    order: 9,
  },
  {
    slug: "tokyo-istanbul",
    emoji: "🌍",
    label: "Tokyo / Istanbul",
    description: "Scènes iconiques entre Orient et modernité.",
    coverImagePath: "/models/modele-yacht-lamborghini.webp",
    order: 10,
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
  adrenaline: "supercars",
  supercars: "supercars",
  moto: "moto",
  yacht: "yacht",
  outfits: "outfits",
  dubai: "dubai",
  "tokyo-istanbul": "tokyo-istanbul",
  "travel-tourism": "voyages",
  streetwear: "lifestyle",
  luxury: "outfits",
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

export function isOutfitCategory(slug: ModelesCategorySlug): boolean {
  return slug === "outfits";
}

export function formatSceneCount(count: number): string {
  if (count <= 0) return "Bientôt";
  return count === 1 ? "1 scène" : `${count} scènes`;
}
