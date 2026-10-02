import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useVoiceCloningAccess } from "@/lib/voice-cloning-access";
import { writeStudioMode } from "@/lib/v2-experience";
import { AuthResolveShell } from "@/components/v2/AuthResolveShell";

/**
 * Clonage IA — réservé admin (preview fondateur).
 */
export function AdminVoiceCloningGate({ children }: { children: ReactNode }) {
  const { isLoading, user, isAdmin } = useAuth();
  const voiceCloning = useVoiceCloningAccess();
  const allowed = isAdmin || voiceCloning;

  if (isLoading && user && !allowed) {
    return <AuthResolveShell />;
  }

  if (!allowed) {
    writeStudioMode("image");
    return <Redirect to="/create" />;
  }

  return <>{children}</>;
}
