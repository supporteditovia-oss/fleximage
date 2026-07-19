/**
 * Programmatic SEO niches — add a row here to create a new landing URL.
 * Path pattern: /generateur/{slug}
 */

export type SeoNicheCategoryId =
  | "vehicules"
  | "voyages"
  | "pranks"
  | "lifestyle";

export interface SeoNicheCategory {
  id: SeoNicheCategoryId;
  label: string;
  description: string;
}

export interface SeoNiche {
  slug: string;
  categoryId: SeoNicheCategoryId;
  /** Visible H1 on the landing */
  h1: string;
  metaTitle: string;
  metaDescription: string;
  /** Short hero supporting line */
  heroSubtitle: string;
}

export const SEO_NICHE_CATEGORIES: readonly SeoNicheCategory[] = [
  {
    id: "vehicules",
    label: "Véhicules de luxe",
    description: "Voitures de sport, jets privés et yachts pour flexer en un clic.",
  },
  {
    id: "voyages",
    label: "Voyages & lieux",
    description: "Dubaï, restaurants étoilés et suites palace ultra réalistes.",
  },
  {
    id: "pranks",
    label: "Pranks & social",
    description: "Fausse copine, célébrités, soirées VIP et passages TV.",
  },
  {
    id: "lifestyle",
    label: "Lifestyle & flex",
    description: "Shopping luxe, montres et glow-up musculation.",
  },
] as const;

export const SEO_NICHES: readonly SeoNiche[] = [
  // Véhicules de luxe
  {
    slug: "voiture-luxe",
    categoryId: "vehicules",
    h1: "Générateur de photos voiture de sport avec LuxeFlexIA",
    metaTitle: "Générateur Photos Voiture de Sport IA — LuxeFlexIA",
    metaDescription:
      "Créez une fausse photo de vous au volant d'une voiture de sport hyper-réaliste avec LuxeFlexIA. Uploadez une photo et générez votre flex auto en quelques secondes.",
    heroSubtitle:
      "Mettez-vous au volant d'une supercar en IA : réaliste, premium, prêt à partager.",
  },
  {
    slug: "jet-prive",
    categoryId: "vehicules",
    h1: "Fausse photo en jet privé générée par IA",
    metaTitle: "Fausse Photo en Jet Privé par IA — LuxeFlexIA",
    metaDescription:
      "Générez une photo de vous dans un jet privé ultra réaliste avec LuxeFlexIA. L'outil IA parfait pour un flex voyage ou un prank entre amis.",
    heroSubtitle:
      "Installez-vous en cabine privée : lumière premium, ambiance VIP, rendu bluffant.",
  },
  {
    slug: "yacht-monaco",
    categoryId: "vehicules",
    h1: "Photo sur un yacht de luxe à Monaco par IA",
    metaTitle: "Photo Yacht de Luxe Monaco IA — LuxeFlexIA",
    metaDescription:
      "Créez une fausse photo de vous sur un yacht de luxe à Monaco avec LuxeFlexIA. Générateur IA pour scènes lifestyle, flex et pranks crédibles.",
    heroSubtitle:
      "Pont ensoleillé, horizon Méditerranée : votre scène yacht prête en un instant.",
  },

  // Voyages & lieux
  {
    slug: "vacances-dubai",
    categoryId: "voyages",
    h1: "Faux voyage à Dubaï généré par intelligence artificielle",
    metaTitle: "Faux Voyage à Dubaï par IA — LuxeFlexIA",
    metaDescription:
      "Simulez des vacances à Dubaï avec des photos IA hyper-réalistes grâce à LuxeFlexIA. Créez votre alibi voyage ou un prank bluffant en quelques clics.",
    heroSubtitle:
      "Skyline, désert ou pool villa : inventez votre escapade Dubaï en IA.",
  },
  {
    slug: "restaurant-etoile",
    categoryId: "voyages",
    h1: "Photo dans un restaurant gastronomique générée par IA",
    metaTitle: "Photo Restaurant Gastronomique IA — LuxeFlexIA",
    metaDescription:
      "Générez une fausse photo de vous dans un restaurant étoilé avec LuxeFlexIA. Idéal pour flex lifestyle, storytelling social ou prank entre proches.",
    heroSubtitle:
      "Table dressée, assiettes signature, ambiance gastronomique ultra crédible.",
  },
  {
    slug: "suite-palace",
    categoryId: "voyages",
    h1: "Fausse photo dans une suite de luxe par IA",
    metaTitle: "Fausse Photo Suite de Luxe IA — LuxeFlexIA",
    metaDescription:
      "Créez une photo de vous dans une suite palace hyper-réaliste avec LuxeFlexIA. Générateur IA pour décors hôtel de luxe, flex et contenus sociaux.",
    heroSubtitle:
      "Suite vue mer, marbre et lumière douce : le palace version IA.",
  },

  // Pranks & social
  {
    slug: "prank-fausse-copine",
    categoryId: "pranks",
    h1: "Générateur fausse copine / faux date (prank) avec LuxeFlexIA",
    metaTitle: "Générateur Fausse Copine / Faux Date Prank — LuxeFlexIA",
    metaDescription:
      "Créez une fausse photo de couple ou de date pour un prank avec LuxeFlexIA. Générateur IA de fausse copine / faux date hyper-réaliste, à utiliser pour rire entre proches.",
    heroSubtitle:
      "Le prank social ultime : une photo de date bluffante, générée en secondes.",
  },
  {
    slug: "prank-rencontre-star",
    categoryId: "pranks",
    h1: "Fausse photo avec une célébrité générée par IA",
    metaTitle: "Fausse Photo avec une Célébrité IA — LuxeFlexIA",
    metaDescription:
      "Générez une fausse photo de rencontre avec une star grâce à LuxeFlexIA. Prank IA réaliste pour surprendre vos amis sur les réseaux sociaux.",
    heroSubtitle:
      "Selfie VIP avec une célébrité : le prank qui fait le buzz.",
  },
  {
    slug: "prank-soiree-vip",
    categoryId: "pranks",
    h1: "S'incruster dans une soirée VIP grâce à l'IA",
    metaTitle: "Prank Soirée VIP Photo IA — LuxeFlexIA",
    metaDescription:
      "Créez une fausse photo de soirée VIP ultra réaliste avec LuxeFlexIA. Incrustez-vous dans une ambiance club, red carpet ou after-party en un clic.",
    heroSubtitle:
      "Lumières, velvet rope, champagne : votre entrée VIP générée par IA.",
  },
  {
    slug: "prank-tv",
    categoryId: "pranks",
    h1: "Faux passage à la télévision généré par IA",
    metaTitle: "Faux Passage à la Télévision IA — LuxeFlexIA",
    metaDescription:
      "Simulez un faux passage TV avec une photo IA hyper-réaliste via LuxeFlexIA. Parfait pour un prank, un meme ou un storytelling social crédible.",
    heroSubtitle:
      "Plateau TV, caméras, lumière studio : votre moment média en IA.",
  },

  // Lifestyle / flex
  {
    slug: "shopping-luxe",
    categoryId: "lifestyle",
    h1: "Photo avec sacs de luxe (Rolex, Vuitton) générée par IA",
    metaTitle: "Photo Shopping Luxe IA (Vuitton, Rolex) — LuxeFlexIA",
    metaDescription:
      "Générez une photo de shopping luxe avec sacs et accessoires premium grâce à LuxeFlexIA. Flex IA réaliste pour réseaux sociaux et pranks lifestyle.",
    heroSubtitle:
      "Sacs iconiques, vitrine prestige : le flex shopping en version IA.",
  },
  {
    slug: "montre-luxe",
    categoryId: "lifestyle",
    h1: "Photo avec montre de luxe au poignet par IA",
    metaTitle: "Photo Montre de Luxe au Poignet IA — LuxeFlexIA",
    metaDescription:
      "Ajoutez une montre de luxe ultra réaliste à votre poignet avec LuxeFlexIA. Générateur IA pour flex horloger, lifestyle premium et contenus sociaux.",
    heroSubtitle:
      "Cadran brillant, détail poignet : la montre prestige générée par IA.",
  },
  {
    slug: "glow-up-muscu",
    categoryId: "lifestyle",
    h1: "Faux corps musclé (glow-up) généré par IA",
    metaTitle: "Faux Corps Musclé Glow-Up Prank IA — LuxeFlexIA",
    metaDescription:
      "Créez un faux glow-up musculation hyper-réaliste avec LuxeFlexIA. Générateur IA pour prank transformation physique ou contenu lifestyle bluffant.",
    heroSubtitle:
      "Avant/après muscu en un clic : le glow-up IA qui surprend tout le monde.",
  },
] as const;

export const SEO_NICHE_PATH_PREFIX = "/generateur";
export const SEO_DIRECTORY_PATH = "/tous-les-generateurs";

export function getSeoNichePath(slug: string): string {
  return `${SEO_NICHE_PATH_PREFIX}/${slug}`;
}

export function getSeoNicheBySlug(slug: string): SeoNiche | undefined {
  return SEO_NICHES.find((niche) => niche.slug === slug);
}

export function getSeoNichesByCategory(
  categoryId: SeoNicheCategoryId,
): SeoNiche[] {
  return SEO_NICHES.filter((niche) => niche.categoryId === categoryId);
}

export function getSeoNicheCategory(
  categoryId: SeoNicheCategoryId,
): SeoNicheCategory | undefined {
  return SEO_NICHE_CATEGORIES.find((category) => category.id === categoryId);
}

export function parseSeoNicheSlugFromPath(pathname: string): string | null {
  const normalized = pathname.split("?")[0]?.split("#")[0] || "";
  const prefix = `${SEO_NICHE_PATH_PREFIX}/`;
  if (!normalized.startsWith(prefix)) return null;
  const slug = normalized.slice(prefix.length).replace(/\/+$/, "");
  return slug || null;
}
