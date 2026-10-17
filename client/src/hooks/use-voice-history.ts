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
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: voiceHistoryQueryKey });
      const previous = queryClient.getQueryData<VoiceHistoryItem[]>(voiceHistoryQueryKey);
      const idSet = new Set(ids);
      if (previous) {
        queryClient.setQueryData(
          voiceHistoryQueryKey,
          previous.filter((item) => !idSet.has(item.id)),
        );
      }
      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(voiceHistoryQueryKey, context.previous);
      }
    },
    onSettled: (_data, error) => {
      if (error) {
        void queryClient.invalidateQueries({ queryKey: voiceHistoryQueryKey });
      }
    },
  });
}

export type { VoiceHistoryItem };
