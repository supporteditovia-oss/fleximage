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
  generationMode?: "vehicle-swap" | "face-swap";
  requiresUserPhoto?: boolean;
  vehicleSwapPrompt?: string;
  faceSwapPrompt?: string;
  readyImagePath?: string;
  /** Exemple « après » généré (face-swap) pour l’aperçu comparatif. */
  demoAfterPath?: string;
};

const entries = catalog as BuiltinCatalogEntry[];

function resolveMode(item: BuiltinCatalogEntry): "vehicle-swap" | "face-swap" {
  if (item.readyImagePath) return "face-swap";
  if (item.generationMode) return item.generationMode;
  if (item.vehicleReferencePath && item.requiresUserPhoto === false) {
    return "vehicle-swap";
  }
  return "face-swap";
}

function resolveDemoAfterPath(item: BuiltinCatalogEntry): string | null {
  if (item.demoAfterPath) return item.demoAfterPath;
  if (item.readyImagePath && item.readyImagePath !== item.imagePath) {
    return item.readyImagePath;
  }
  return null;
}

/** Modèles livrés avec l'app : visibles même si l'admin n'a rien configuré. */
export const BUILTIN_FEED_TEMPLATES: FeedTemplate[] = entries.map((item) => {
  const mode = resolveMode(item);
  const demoAfterPath = resolveDemoAfterPath(item);
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    previewUrl: item.readyImagePath || item.imagePath,
    demoBeforeUrl: item.imagePath,
    demoAfterUrl: demoAfterPath,
    icon: null,
    keywords: [],
    isFeatured: true,
    generationType: "image",
    category: item.category,
    categoryName: item.categoryName,
    referenceImageCount: item.readyImagePath ? 1 : item.vehicleReferencePath ? 2 : 1,
    requiresUserPhoto: mode === "face-swap",
    generationMode: mode,
    generationPrompt:
      mode === "vehicle-swap"
        ? item.vehicleSwapPrompt || item.prompt
        : item.faceSwapPrompt || item.prompt,
    isBuiltin: true,
  };
});

export function hasTemplateBeforeAfterDemo(template: FeedTemplate): boolean {
  return Boolean(template.demoBeforeUrl && template.demoAfterUrl);
}

export function getBuiltinGenerationPrompt(template: FeedTemplate): string {
  return template.generationPrompt?.trim() || template.name;
}

export function isVehicleSwapTemplate(template: FeedTemplate): boolean {
  return template.generationMode === "vehicle-swap";
}

export function findBuiltinTemplate(idOrSlug: string): FeedTemplate | undefined {
  return BUILTIN_FEED_TEMPLATES.find(
    (template) => template.id === idOrSlug || template.slug === idOrSlug,
  );
}
