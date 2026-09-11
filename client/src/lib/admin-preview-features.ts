import { useAuth } from "@/hooks/use-auth";
import { useV2Access } from "@/hooks/use-v2-access";

/** Modèles prêts, catalogue outfits, studio vidéo IA — preview admin uniquement. */
export function canAccessAdminPreviewFeatures(input: {
  isAdmin: boolean;
  isAuthLoading: boolean;
  profileLoaded: boolean;
}): boolean {
  if (!input.profileLoaded && !input.isAdmin) return false;
  if (input.isAuthLoading && !input.isAdmin) return false;
  return input.isAdmin;
}

export function useAdminPreviewFeatures(): boolean {
  const { isAdmin, isLoading, profile, user } = useAuth();
  const { isAdmin: v2Admin } = useV2Access();
  const effectiveAdmin = isAdmin || v2Admin;
  return canAccessAdminPreviewFeatures({
    isAdmin: effectiveAdmin,
    isAuthLoading: isLoading && !effectiveAdmin,
    profileLoaded: Boolean(user && profile),
  });
}
