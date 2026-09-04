import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";

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
  };
}

export function useTemplateFeed(options: { enabled?: boolean } = {}) {
  return useQuery<FeedTemplate[]>({
    queryKey: templateFeedQueryKey,
    queryFn: async () => {
      const res = await authFetch("/api/templates");
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.templates ?? []);
      return list
        .map(normalize)
        .filter((t: FeedTemplate | null): t is FeedTemplate => t !== null)
        // Un modèle sans référence mène à une impasse au moment de générer.
        .filter((t: FeedTemplate) => t.referenceImageCount > 0);
    },
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });
}
