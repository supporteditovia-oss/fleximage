import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";

interface GeneratePrankInput {
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

interface GeneratePrankResponse {
  id: string;
  taskId: string;
  status: string;
}

interface PrankStatusResponse {
  prankId: string;
  status: "waiting" | "success" | "fail";
  resultUrls: string[];
  watermarkedUrls?: string[];
  failMessage: string | null;
  costTime: number | null;
  isSubscriber?: boolean;
  requiresPaywall?: boolean;
  resultType?: "image" | "video";
}

interface PrankHistoryItem {
  id: string;
  user_id: string;
  template_id: string | null;
  final_prompt: string;
  kie_task_id: string;
  status: "waiting" | "success" | "fail";
  result_urls: string | null;
  input_urls: string | null;
  fail_message: string | null;
  cost_time: string | null;
  aspect_ratio: string | null;
  created_at: string;
  updated_at: string;
  prompt_templates: { name: string; category: string } | null;
}

export function useGeneratePrank() {
  const queryClient = useQueryClient();
  return useMutation<GeneratePrankResponse, Error, GeneratePrankInput>({
    mutationFn: async (data) => {
      const res = await authFetch("/api/pranks/generate", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prank-history"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useGenerateDirectPrank() {
  const queryClient = useQueryClient();
  return useMutation<GeneratePrankResponse, Error, GenerateDirectInput>({
    mutationFn: async (data) => {
      const res = await authFetch("/api/pranks/generate-direct", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prank-history"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useGenerateVideoPrank() {
  const queryClient = useQueryClient();
  return useMutation<GeneratePrankResponse, Error, GenerateVideoInput>({
    mutationFn: async (data) => {
      const res = await authFetch("/api/pranks/generate-video", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prank-history"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function usePrankStatus(taskId: string | null) {
  return useQuery<PrankStatusResponse>({
    queryKey: ["prank-status", taskId],
    queryFn: async () => {
      const res = await authFetch(`/api/pranks/${taskId}/status`);
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

export function usePrankHistory() {
  return useQuery<PrankHistoryItem[]>({
    queryKey: ["prank-history"],
    queryFn: async () => {
      const res = await authFetch("/api/pranks/history");
      return res.json();
    },
  });
}

export function useDeletePrank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prankId: string) => {
      const res = await authFetch(
        `/api/pranks/${encodeURIComponent(prankId)}`,
        {
          method: "DELETE",
        },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prank-history"] });
    },
  });
}
