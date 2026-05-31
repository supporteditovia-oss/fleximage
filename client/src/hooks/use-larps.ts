import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";

interface GenerateLarpInput {
  template_id: string;
  placeholders?: Record<string, string>;
  aspect_ratio?: string;
}

interface GenerateDirectInput {
  prompt: string;
  aspect_ratio?: string;
  images?: string[];
  template_id?: string;
}

interface GenerateVideoInput {
  prompt: string;
  aspect_ratio?: string;
  images?: string[];
}

interface GenerateLarpResponse {
  id: string;
  taskId: string;
  status: string;
}

interface LarpStatusResponse {
  larpId: string;
  status: "waiting" | "success" | "fail";
  resultUrls: string[];
  watermarkedUrls?: string[];
  failMessage: string | null;
  costTime: number | null;
  isSubscriber?: boolean;
  requiresPaywall?: boolean;
  resultType?: "image" | "video";
}

interface LarpHistoryItem {
  id: string;
  userId: string;
  templateId: string | null;
  generationType: "image" | "video";
  finalPrompt: string;
  providerTaskId: string | null;
  status: "waiting" | "success" | "fail";
  outputAssets: string[];
  watermarkedAssets: string[];
  inputAssets: string[];
  failMessage: string | null;
  costTime: string | null;
  aspectRatio: string | null;
  createdAt: string;
  updatedAt: string;
  template: { name: string; category: string | null } | null;
}

export function useGenerateLarp() {
  const queryClient = useQueryClient();
  return useMutation<GenerateLarpResponse, Error, GenerateLarpInput>({
    mutationFn: async (data) => {
      const res = await authFetch("/api/larps/generate", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["larp-history"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useGenerateDirectLarp() {
  const queryClient = useQueryClient();
  return useMutation<GenerateLarpResponse, Error, GenerateDirectInput>({
    mutationFn: async (data) => {
      const res = await authFetch("/api/larps/generate-direct", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["larp-history"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useGenerateVideoLarp() {
  const queryClient = useQueryClient();
  return useMutation<GenerateLarpResponse, Error, GenerateVideoInput>({
    mutationFn: async (data) => {
      const res = await authFetch("/api/larps/generate-video", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["larp-history"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useLarpStatus(taskId: string | null) {
  return useQuery<LarpStatusResponse>({
    queryKey: ["larp-status", taskId],
    queryFn: async () => {
      const res = await authFetch(`/api/larps/${taskId}/status`);
      return res.json();
    },
    enabled: !!taskId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === "success" || data.status === "fail")) {
        return false;
      }
      return 2000;
    },
  });
}

export function useLarpHistory() {
  return useQuery<LarpHistoryItem[]>({
    queryKey: ["larp-history"],
    queryFn: async () => {
      const res = await authFetch("/api/larps/history");
      return res.json();
    },
  });
}

export function useDeleteLarp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (larpId: string) => {
      const res = await authFetch(
        `/api/larps/${encodeURIComponent(larpId)}`,
        {
          method: "DELETE",
        },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["larp-history"] });
    },
  });
}
