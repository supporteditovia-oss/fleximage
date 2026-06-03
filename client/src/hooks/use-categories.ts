import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import type { Category } from "@shared/schema";

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await authFetch("/api/categories");
      return res.json();
    },
  });
}

export function useAllCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories", "all"],
    queryFn: async () => {
      const res = await authFetch("/api/categories");
      return res.json();
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      name_en?: string | null;
      slug: string;
      is_active?: boolean;
      display_order?: number;
    }) => {
      const res = await authFetch("/api/categories", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      name_en?: string | null;
      slug?: string;
      is_active?: boolean;
      display_order?: number;
    }) => {
      const res = await authFetch(`/api/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/categories/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
