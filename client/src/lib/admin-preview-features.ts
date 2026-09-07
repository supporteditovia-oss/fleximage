import { useAuth } from "@/hooks/use-auth";

/** Modèles prêts, catalogue outfits, etc. — visible uniquement par les admins. */
export function canAccessAdminPreviewFeatures(input: {
  isAdmin: boolean;
  isAuthLoading: boolean;
  profileLoaded: boolean;
}): boolean {
  if (input.isAuthLoading || !input.profileLoaded) return false;
  return input.isAdmin;
}

export function useAdminPreviewFeatures(): boolean {
  const { isAdmin, isLoading, profile, user } = useAuth();
  return canAccessAdminPreviewFeatures({
    isAdmin,
    isAuthLoading: isLoading,
    profileLoaded: Boolean(user && profile),
  });
}
