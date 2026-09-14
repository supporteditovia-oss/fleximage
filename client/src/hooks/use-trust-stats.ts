import { useQuery } from "@tanstack/react-query";
import type { TrustStatsPayload } from "@shared/trust-stats";

export const trustStatsQueryKey = ["/api/public/trust-stats"] as const;

const STALE_MS = 10 * 60 * 1000;

async function fetchTrustStats(): Promise<TrustStatsPayload> {
  const res = await fetch("/api/public/trust-stats");
  if (!res.ok) {
    throw new Error(`trust-stats ${res.status}`);
  }
  return res.json();
}

export function useTrustStats() {
  return useQuery({
    queryKey: trustStatsQueryKey,
    queryFn: fetchTrustStats,
    staleTime: STALE_MS,
    gcTime: STALE_MS * 2,
    retry: 1,
  });
}
