import { useAuth } from "@/hooks/use-auth";
import { isV2ExperienceEnabled } from "@/lib/v2-experience";

/** Modèles prêts, catalogue outfits, studio vidéo IA — même accès que le studio V2. */
export function canAccessAdminPreviewFeatures(input: {
  isAdmin: boolean;
  isSubscriber: boolean;
  credits: number;
  isAuthLoading: boolean;
  profileLoaded: boolean;
}): boolean {
  if (input.isAuthLoading || !input.profileLoaded) return false;
  return isV2ExperienceEnabled(
    {
      role: input.isAdmin ? "admin" : "user",
      is_subscriber: input.isSubscriber,
      credits: input.credits,
    },
    input.isAdmin,
  );
}

export function useAdminPreviewFeatures(): boolean {
  const { isAdmin, isLoading, profile, user } = useAuth();
  return canAccessAdminPreviewFeatures({
    isAdmin,
    isSubscriber: Boolean(profile?.is_subscriber),
    credits: profile?.credits ?? 0,
    isAuthLoading: isLoading,
    profileLoaded: Boolean(user && profile),
  });
}
