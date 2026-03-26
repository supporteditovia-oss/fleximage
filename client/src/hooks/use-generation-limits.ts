import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";

interface GenerationEligibility {
  canGenerate: boolean;
  isSubscriber: boolean;
  generationCount: number;
  reason?: string;
}

export function useGenerationEligibility() {
  return useQuery<GenerationEligibility>({
    queryKey: ["generation-eligibility"],
    queryFn: async () => {
      const res = await authFetch("/api/pranks/can-generate");
      if (!res.ok) throw new Error("Failed to check generation eligibility");
      return res.json();
    },
    staleTime: 30_000,
  });
}
