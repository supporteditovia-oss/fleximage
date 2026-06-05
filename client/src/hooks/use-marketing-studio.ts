import { useMutation, useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import { api, buildUrl } from "@shared/routes";

interface MarketingUploadResponse {
  url: string;
}

interface MarketingGenerateInput {
  prompt: string;
  referenceImageUrl: string;
}

interface MarketingGenerateResponse {
  taskId: string;
}

export interface MarketingStatusResponse {
  status: "waiting" | "success" | "fail";
  resultUrl: string | null;
  failMessage: string | null;
}

export function useUploadMarketingImage() {
  return useMutation<MarketingUploadResponse, Error, string>({
    mutationFn: async (imageDataUrl) => {
      const res = await authFetch(api.admin.marketingUpload.path, {
        method: "POST",
        body: JSON.stringify({ image: imageDataUrl }),
      });
      return res.json();
    },
  });
}

export function useGenerateMarketing() {
  return useMutation<
    MarketingGenerateResponse,
    Error,
    MarketingGenerateInput
  >({
    mutationFn: async (data) => {
      const res = await authFetch(api.admin.marketingGenerate.path, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
  });
}

export function useMarketingStatus(taskId: string | null) {
  return useQuery<MarketingStatusResponse>({
    queryKey: ["marketing-status", taskId],
    queryFn: async () => {
      const res = await authFetch(
        buildUrl(api.admin.marketingStatus.path, { taskId: taskId! }),
      );
      return res.json();
    },
    enabled: !!taskId,
    retry: (failureCount, err) => {
      const status = (err as { status?: number } | null)?.status;
      if (typeof status === "number" && status >= 400 && status < 500) {
        return false;
      }
      return failureCount < 8;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchIntervalInBackground: true,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "fail") return false;
      if (data?.status === "success" && data.resultUrl) return false;
      return 2000;
    },
  });
}
