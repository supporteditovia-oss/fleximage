import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteVoiceGenerations,
  fetchVoiceHistory,
  type VoiceHistoryItem,
} from "@/lib/voice-api";

export const voiceHistoryQueryKey = ["voice-history"] as const;

export function useVoiceHistory(enabled = true) {
  return useQuery({
    queryKey: voiceHistoryQueryKey,
    queryFn: () => fetchVoiceHistory(50),
    enabled,
    staleTime: 30_000,
  });
}

export function useDeleteVoiceGenerations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteVoiceGenerations(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: voiceHistoryQueryKey });
    },
  });
}

export type { VoiceHistoryItem };
