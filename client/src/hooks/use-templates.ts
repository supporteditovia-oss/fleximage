import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { authFetch } from "@/lib/api";

import { api, buildUrl } from "@shared/routes";

import type { PromptTemplate, ReferenceImageDto } from "@shared/schema";



type TemplateGenerationType = "image" | "video" | "both";



export type UploadReferenceImageItem = {

  image: string;

  image_prompt: string;

  video_prompt?: string | null;

  requires_face_asset?: boolean;

};



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



export function useTemplateReferenceImages(templateId: string | null) {

  return useQuery<ReferenceImageDto[]>({

    queryKey: ["templates", templateId, "reference-images"],

    queryFn: async () => {

      const res = await authFetch(

        buildUrl(api.templates.referenceImages.list.path, { id: templateId! }),

      );

      if (!res.ok) throw new Error("Failed to load reference images");

      return res.json();

    },

    enabled: !!templateId,

  });

}



export function useCreateTemplate() {

  const queryClient = useQueryClient();

  return useMutation({

    mutationFn: async (data: {

      name: string;

      name_en?: string | null;

      description?: string;

      prompt_text: string;

      category: string | null;

      is_active?: boolean;

      keywords?: string | null;

      icon?: string | null;

      generation_type?: TemplateGenerationType;

      video_prompt_text?: string | null;

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

      name_en?: string | null;

      description?: string;

      prompt_text?: string;

      category?: string | null;

      is_active?: boolean;

      keywords?: string | null;

      icon?: string | null;

      generation_type?: TemplateGenerationType;

      video_prompt_text?: string | null;

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



export function useUploadTemplateReferenceImages() {

  const queryClient = useQueryClient();

  return useMutation({

    mutationFn: async ({

      id,

      items,

    }: {

      id: string;

      items: UploadReferenceImageItem[];

    }) => {

      const res = await authFetch(

        buildUrl(api.templates.referenceImages.create.path, { id }),

        {

          method: "POST",

          body: JSON.stringify({ items }),

        },

      );

      if (!res.ok) {

        const err = await res.json().catch(() => ({}));

        throw new Error(err.message || "Upload failed");

      }

      return res.json() as Promise<ReferenceImageDto[]>;

    },

    onSuccess: (_data, variables) => {

      queryClient.invalidateQueries({ queryKey: ["templates"] });

      queryClient.invalidateQueries({

        queryKey: ["templates", variables.id, "reference-images"],

      });

    },

  });

}



export function useUpdateReferenceImage() {

  const queryClient = useQueryClient();

  return useMutation({

    mutationFn: async ({

      templateId,

      refId,

      image_prompt,

      video_prompt,

      requires_face_asset,

    }: {

      templateId: string;

      refId: string;

      image_prompt?: string;

      video_prompt?: string | null;

      requires_face_asset?: boolean;

    }) => {

      const res = await authFetch(

        buildUrl(api.templates.referenceImages.update.path, {

          id: templateId,

          refId,

        }),

        {

          method: "PATCH",

          body: JSON.stringify({
            image_prompt,
            video_prompt,
            requires_face_asset,
          }),

        },

      );

      if (!res.ok) {

        const err = await res.json().catch(() => ({}));

        throw new Error(err.message || "Update failed");

      }

      return res.json() as Promise<ReferenceImageDto>;

    },

    onSuccess: (_data, variables) => {

      queryClient.invalidateQueries({ queryKey: ["templates"] });

      queryClient.invalidateQueries({

        queryKey: ["templates", variables.templateId, "reference-images"],

      });

    },

  });

}



export function useDeleteReferenceImage() {

  const queryClient = useQueryClient();

  return useMutation({

    mutationFn: async ({

      templateId,

      refId,

    }: {

      templateId: string;

      refId: string;

    }) => {

      const res = await authFetch(

        buildUrl(api.templates.referenceImages.delete.path, {

          id: templateId,

          refId,

        }),

        { method: "DELETE" },

      );

      if (!res.ok && res.status !== 204) {

        const err = await res.json().catch(() => ({}));

        throw new Error(err.message || "Delete failed");

      }

    },

    onSuccess: (_data, variables) => {

      queryClient.invalidateQueries({ queryKey: ["templates"] });

      queryClient.invalidateQueries({

        queryKey: ["templates", variables.templateId, "reference-images"],

      });

    },

  });

}


