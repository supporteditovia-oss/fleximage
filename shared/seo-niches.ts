/**
 * Programmatic SEO niches — add a row in `shared/seo-niches.json` to create a new landing URL.
 * Path pattern: /generateur/{slug}
 */
import nichesDataFr from "./seo-niches.json";
import nichesDataEn from "./seo-niches-en.json";
import { toUiLocale, resolvePreferredLocale } from "./locales";

export type SeoNicheCategoryId =
  | "vehicules"
  | "voyages"
  | "pranks"
  | "lifestyle"
  | "generation";

export interface SeoNicheCategory {
  id: SeoNicheCategoryId;
  label: string;
  description: string;
}

export interface SeoNicheFaq {
  question: string;
  answer: string;
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
  /** Longer intro paragraph for topical depth */
  intro: string;
  /** Benefit / use-case bullets */
  bullets: readonly string[];
  /** Example prompts users can try */
  promptIdeas: readonly string[];
  /** FAQ for on-page + JSON-LD */
  faqs: readonly SeoNicheFaq[];
  /** Extra search phrases mentioned in body (not a meta keywords dump) */
  searchPhrases: readonly string[];
}

type SeoNicheCatalog = {
  categories: readonly SeoNicheCategory[];
  niches: readonly SeoNiche[];
};

const catalogs: Record<"fr" | "en", SeoNicheCatalog> = {
  fr: nichesDataFr as SeoNicheCatalog,
  en: nichesDataEn as SeoNicheCatalog,
};

function pickCatalog(localeLike?: string | null): SeoNicheCatalog {
  const ui = toUiLocale(resolvePreferredLocale(localeLike, "fr"));
  return catalogs[ui];
}

/** Default French catalog (sitemap, build scripts). */
export const SEO_NICHE_CATEGORIES =
  nichesDataFr.categories as readonly SeoNicheCategory[];

export const SEO_NICHES = nichesDataFr.niches as readonly SeoNiche[];

export const SEO_NICHE_PATH_PREFIX = "/generateur";
export const SEO_DIRECTORY_PATH = "/tous-les-generateurs";

export function getSeoNichePath(slug: string, localeLike?: string | null): string {
  const path = `${SEO_NICHE_PATH_PREFIX}/${slug}`;
  if (toUiLocale(resolvePreferredLocale(localeLike, "fr")) !== "en") {
    return path;
  }
  return `${path}?lang=en`;
}

export function getSeoNicheCategories(
  localeLike?: string | null,
): readonly SeoNicheCategory[] {
  return pickCatalog(localeLike).categories;
}

export function getSeoNiches(localeLike?: string | null): readonly SeoNiche[] {
  return pickCatalog(localeLike).niches;
}

export function getSeoNicheBySlug(
  slug: string,
  localeLike?: string | null,
): SeoNiche | undefined {
  return getSeoNiches(localeLike).find((niche) => niche.slug === slug);
}

export function getSeoNichesByCategory(
  categoryId: SeoNicheCategoryId,
  localeLike?: string | null,
): SeoNiche[] {
  return getSeoNiches(localeLike).filter((niche) => niche.categoryId === categoryId);
}

export function getSeoNicheCategory(
  categoryId: SeoNicheCategoryId,
  localeLike?: string | null,
): SeoNicheCategory | undefined {
  return getSeoNicheCategories(localeLike).find((category) => category.id === categoryId);
}

export function parseSeoNicheSlugFromPath(pathname: string): string | null {
  const normalized = pathname.split("?")[0]?.split("#")[0] || "";
  const prefix = `${SEO_NICHE_PATH_PREFIX}/`;
  if (!normalized.startsWith(prefix)) return null;
  const slug = normalized.slice(prefix.length).replace(/\/+$/, "");
  return slug || null;
}
