import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { authFetch } from "@/lib/api";
import { markV2ExperienceEnabled } from "@/lib/v2-experience";

type V2AccessResponse = {
  enabled: boolean;
  isAdmin: boolean;
  ipAllowed: boolean;
  ip: string;
};

const V2_ACCESS_TIMEOUT_MS = 2500;

const V2_DENIED: V2AccessResponse = {
  enabled: false,
  isAdmin: false,
  ipAllowed: false,
  ip: "",
};

async function fetchV2Access(): Promise<V2AccessResponse> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), V2_ACCESS_TIMEOUT_MS);

  try {
    const result = await Promise.race([
      (async () => {
        const res = await authFetch("/api/v2-access", {
          signal: controller.signal,
        });
        if (!res.ok) return V2_DENIED;
        return (await res.json()) as V2AccessResponse;
      })(),
      new Promise<V2AccessResponse>((resolve) => {
        window.setTimeout(() => resolve(V2_DENIED), V2_ACCESS_TIMEOUT_MS);
      }),
    ]);
    return result;
  } catch {
    return V2_DENIED;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * V2 studio — réservé aux admins (tous appareils / réseaux).
 * L’IP allowlist reste exposée pour debug ; ne bloque plus l’accès admin.
 */
export function useV2Access() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  const { data } = useQuery({
    queryKey: ["v2-access", user?.id ?? "anon"],
    queryFn: fetchV2Access,
    enabled: Boolean(user) && !authLoading,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const ipAllowed = Boolean(data?.ipAllowed);
  const v2Enabled = Boolean(isAdmin);
  const isLoading = authLoading;

  useEffect(() => {
    markV2ExperienceEnabled(v2Enabled);
  }, [v2Enabled]);

  return {
    v2Enabled,
    isLoading,
    clientIp: data?.ip,
    ipAllowed,
    isAdmin,
  };
}
