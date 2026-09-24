import { useAuth } from "@/hooks/use-auth";
import { useV2Access } from "@/hooks/use-v2-access";
import { useAdminPreviewFeatures } from "@/lib/admin-preview-features";

/** Admin preview : modèles prêts, outfits catalogue, etc. */
export function useModelesAdminAccess(): boolean {
  const { isAdmin } = useAuth();
  const { isAdmin: v2Admin, v2Enabled } = useV2Access();
  const adminPreview = useAdminPreviewFeatures();
  return Boolean(isAdmin || v2Admin || v2Enabled || adminPreview);
}
