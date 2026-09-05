import catalog from "@shared/builtin-image-templates.json";
import type { FeedTemplate } from "@/hooks/use-template-feed";

type BuiltinCatalogEntry = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imagePath: string;
  prompt: string;
  category: string;
  categoryName: string;
  vehicleReferencePath?: string;
};

const entries = catalog as BuiltinCatalogEntry[];

/** Modèles livrés avec l'app : visibles même si l'admin n'a rien configuré. */
export const BUILTIN_FEED_TEMPLATES: FeedTemplate[] = entries.map((item) => ({
  id: item.id,
  slug: item.slug,
  name: item.name,
  description: item.description,
  previewUrl: item.imagePath,
  icon: null,
  keywords: [],
  isFeatured: true,
  generationType: "image",
  category: item.category,
  categoryName: item.categoryName,
  referenceImageCount: item.vehicleReferencePath ? 2 : 1,
  requiresUserPhoto: true,
  generationPrompt: item.prompt,
  isBuiltin: true,
}));

export function getBuiltinGenerationPrompt(template: FeedTemplate): string {
  return template.generationPrompt?.trim() || template.name;
}

export function findBuiltinTemplate(idOrSlug: string): FeedTemplate | undefined {
  return BUILTIN_FEED_TEMPLATES.find(
    (template) => template.id === idOrSlug || template.slug === idOrSlug,
  );
}
