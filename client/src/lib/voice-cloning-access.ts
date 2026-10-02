import { useAdminPreviewFeatures } from "@/lib/admin-preview-features";

/** Clonage IA — preview admin (fondateur) jusqu’à ouverture clients. */
export function canAccessVoiceCloningPreview(isAdmin: boolean): boolean {
  return isAdmin;
}

export function useVoiceCloningAccess(): boolean {
  return useAdminPreviewFeatures();
}
