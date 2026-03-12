import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import type { PromptTemplate } from "@shared/schema";

export function useTemplates() {
  return useQuery<PromptTemplate[]>({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await authFetch("/api/templates");
      return res.json();
    },
  });
}

export function useAllTemplates() {
  return useQuery<PromptTemplate[]>({
    queryKey: ["templates", "all"],
    queryFn: async () => {
      const res = await authFetch("/api/templates");
      return res.json();
    },
  });
}

export function useTemplate(id: string | null) {
  return useQuery<PromptTemplate>({
    queryKey: ["templates", id],
    queryFn: async () => {
      const res = await authFetch(`/api/templates/${id}`);
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      prompt_text: string;
      category: string | null;
      is_active?: boolean;
      keywords?: string | null;
      icon?: string | null;
      image_slots?: string;
      text_fields?: string;
    }) => {
      const res = await authFetch("/api/templates", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      description?: string;
      prompt_text?: string;
      category?: string | null;
      is_active?: boolean;
      keywords?: string | null;
      icon?: string | null;
      image_slots?: string;
      text_fields?: string;
    }) => {
      const res = await authFetch(`/api/templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/templates/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useUploadTemplateImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      field,
      image,
    }: {
      id: string;
      field: "example_before_url" | "example_after_url";
      image: string;
    }) => {
      const res = await authFetch(`/api/templates/${id}/upload-image`, {
        method: "POST",
        body: JSON.stringify({ field, image }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}
