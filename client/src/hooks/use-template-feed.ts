import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import { BUILTIN_FEED_TEMPLATES } from "@/lib/builtin-image-templates";

/** Modèle tel que le voit l'utilisateur dans le fil plein écran. */
export type FeedTemplate = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  previewUrl: string | null;
  icon: string | null;
  keywords: string[];
  isFeatured: boolean;
  generationType: "image" | "video" | "both";
  category: string | null;
  categoryName: string | null;
  referenceImageCount: number;
  requiresUserPhoto: boolean;
  /** Prompt serveur pour les modèles intégrés au site. */
  generationPrompt?: string;
  /** URL modèle d'origine (avant) pour l'aperçu comparatif. */
  demoBeforeUrl?: string | null;
  /** URL exemple généré (après) pour l'aperçu comparatif. */
  demoAfterUrl?: string | null;
  /** vehicle-swap = remplace le quad ; face-swap = remplace la personne. */
  generationMode?: "vehicle-swap" | "face-swap";
  isBuiltin?: boolean;
};

export const templateFeedQueryKey = ["templates", "feed"] as const;

/**
 * L'API renvoie soit `{ templates: [...] }` (production Vercel), soit un
 * tableau brut (serveur Express), et les champs ne portent pas les mêmes noms.
 * On normalise ici pour que le fil n'ait qu'une seule forme à gérer.
 */
function normalize(raw: any): FeedTemplate | null {
  const previewUrl =
    raw.previewUrl ?? raw.example_after_url ?? raw.cover_url ?? null;
  if (!raw?.id || !previewUrl) return null;

  const referenceImageCount =
    raw.referenceImageCount ?? raw.reference_image_count ?? 0;

  const requiresUserPhoto =
    raw.requiresUserPhoto ??
    !(raw.has_face_optional_reference_image ?? false);

  const demoBeforeUrl =
    raw.demoBeforeUrl ??
    raw.demo_before_url ??
    raw.example_before_url ??
    null;
  const demoAfterUrl =
    raw.demoAfterUrl ??
    raw.demo_after_url ??
    raw.example_after_url ??
    null;

  return {
    id: raw.id,
    slug: raw.slug ?? raw.id,
    name: raw.name ?? "Modèle",
    description: raw.description ?? null,
    previewUrl,
    icon: raw.icon ?? null,
    keywords: Array.isArray(raw.keywords)
      ? raw.keywords
      : typeof raw.keywords === "string" && raw.keywords
        ? raw.keywords.split(",").map((k: string) => k.trim())
        : [],
    isFeatured: Boolean(raw.isFeatured ?? raw.is_featured),
    generationType: raw.generationType ?? raw.generation_type ?? "image",
    category: raw.category ?? null,
    categoryName: raw.categoryName ?? raw.category_name ?? null,
    referenceImageCount,
    requiresUserPhoto,
    demoBeforeUrl,
    demoAfterUrl,
  };
}

function mergeTemplateLists(remote: FeedTemplate[]): FeedTemplate[] {
  const byId = new Map<string, FeedTemplate>();
  for (const template of BUILTIN_FEED_TEMPLATES) {
    byId.set(template.id, template);
  }
  for (const template of remote) {
    const existing = byId.get(template.id);
    if (existing) {
      byId.set(template.id, {
        ...existing,
        ...template,
        id: existing.id,
        slug: existing.slug || template.slug,
        generationPrompt: existing.generationPrompt ?? template.generationPrompt,
        generationMode: existing.generationMode ?? template.generationMode,
        isBuiltin: existing.isBuiltin ?? template.isBuiltin,
        demoBeforeUrl: template.demoBeforeUrl ?? existing.demoBeforeUrl,
        demoAfterUrl: template.demoAfterUrl ?? existing.demoAfterUrl,
      });
    } else {
      byId.set(template.id, template);
    }
  }
  return Array.from(byId.values());
}

export function useTemplateFeed(options: { enabled?: boolean } = {}) {
  return useQuery<FeedTemplate[]>({
    queryKey: templateFeedQueryKey,
    queryFn: async () => {
      try {
        const res = await authFetch("/api/templates");
        if (!res.ok) return BUILTIN_FEED_TEMPLATES;
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.templates ?? []);
        const remote = list
          .map(normalize)
          .filter((t: FeedTemplate | null): t is FeedTemplate => t !== null)
          .filter((t: FeedTemplate) => t.referenceImageCount > 0);
        return mergeTemplateLists(remote);
      } catch {
        return BUILTIN_FEED_TEMPLATES;
      }
    },
    enabled: options.enabled ?? true,
    initialData: BUILTIN_FEED_TEMPLATES,
    placeholderData: BUILTIN_FEED_TEMPLATES,
    staleTime: 5 * 60 * 1000,
  });
}
