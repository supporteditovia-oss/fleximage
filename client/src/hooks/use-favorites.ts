import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";

export function useFavorites() {
  return useQuery<string[]>({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await authFetch("/api/favorites");
      return res.json();
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      templateId,
      isFavorite,
    }: {
      templateId: string;
      isFavorite: boolean;
    }) => {
      const res = await authFetch(`/api/favorites/${templateId}`, {
        method: isFavorite ? "DELETE" : "POST",
      });
      return res.json();
    },
    onMutate: async ({ templateId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ["favorites"] });
      const previous = queryClient.getQueryData<string[]>(["favorites"]) || [];
      const next = isFavorite
        ? previous.filter((id) => id !== templateId)
        : [...previous, templateId];
      queryClient.setQueryData(["favorites"], next);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["favorites"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}
