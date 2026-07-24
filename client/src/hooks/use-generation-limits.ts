import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

interface GenerationEligibility {
  canGenerate: boolean;
  isSubscriber: boolean;
  generationCount: number;
  reason?: string;
}

export function useGenerationEligibility() {
  const { user, isLoading: isAuthLoading } = useAuth();

  return useQuery<GenerationEligibility>({
    queryKey: ["generation-eligibility", user?.id ?? null],
    enabled: !isAuthLoading && !!user?.id,
    queryFn: async () => {
      const res = await authFetch("/api/larps/can-generate");
      if (!res.ok) throw new Error("Failed to check generation eligibility");
      return res.json();
    },
    staleTime: 30_000,
  });
}
