import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AUTH_CONFIG } from "@/config/auth";
import { useAdminPreviewFeatures } from "@/lib/admin-preview-features";
import { useV2Access } from "@/hooks/use-v2-access";
import { AuthResolveShell } from "@/components/v2/AuthResolveShell";

/**
 * Modèles prêts — preview admin uniquement (fondateur / rôle admin).
 */
export function AdminModelesGate({ children }: { children: ReactNode }) {
  const { isLoading: authLoading, user } = useAuth();
  const { isLoading: v2Loading, isAdmin: v2Admin } = useV2Access();
  const adminPreview = useAdminPreviewFeatures();

  const resolving =
    authLoading ||
    (Boolean(user) && v2Loading && !v2Admin && !adminPreview);

  if (resolving) {
    return <AuthResolveShell />;
  }

  if (!user) {
    return <Redirect to={AUTH_CONFIG.LOGIN_PATH} />;
  }

  if (!adminPreview) {
    return <Redirect to="/generate" />;
  }

  return <>{children}</>;
}
