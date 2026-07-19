/**
 * Programmatic SEO niches — add a row in `shared/seo-niches.json` to create a new landing URL.
 * Path pattern: /generateur/{slug}
 */
import nichesData from "./seo-niches.json";

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

export const SEO_NICHE_CATEGORIES =
  nichesData.categories as readonly SeoNicheCategory[];

export const SEO_NICHES = nichesData.niches as readonly SeoNiche[];

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
