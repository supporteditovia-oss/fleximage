import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { authFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@shared/routes";

function toAssetUrls(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeHistoryStatus(status: unknown): "waiting" | "success" | "fail" {
  if (status === "succeeded" || status === "success") return "success";
  if (status === "failed" || status === "fail") return "fail";
  return "waiting";
}

function normalizeHistoryItem(raw: Record<string, unknown>): LarpHistoryItem {
  const templateRaw = raw.template;
  const template =
    templateRaw && typeof templateRaw === "object"
      ? {
          name: String((templateRaw as { name?: string }).name ?? ""),
          nameEn:
            (templateRaw as { nameEn?: string | null; name_en?: string | null })
              .nameEn ??
            (templateRaw as { name_en?: string | null }).name_en ??
            null,
          category:
            (templateRaw as { category?: string | null }).category ?? null,
        }
      : null;

  return {
    id: String(raw.id ?? ""),
    userId: String(raw.userId ?? raw.user_id ?? ""),
    templateId:
      raw.templateId != null
        ? String(raw.templateId)
        : raw.template_id != null
          ? String(raw.template_id)
          : null,
    generationType:
      raw.generationType === "video" || raw.generation_type === "video"
        ? "video"
        : "image",
    finalPrompt: String(raw.finalPrompt ?? raw.final_prompt ?? ""),
    providerTaskId:
      raw.providerTaskId != null
        ? String(raw.providerTaskId)
        : raw.provider_task_id != null
          ? String(raw.provider_task_id)
          : null,
    status: normalizeHistoryStatus(raw.status),
    outputAssets: toAssetUrls(raw.outputAssets ?? raw.output_assets),
    watermarkedAssets: toAssetUrls(
      raw.watermarkedAssets ?? raw.watermarked_assets,
    ),
    inputAssets: toAssetUrls(raw.inputAssets ?? raw.input_assets),
    failMessage:
      raw.failMessage != null
        ? String(raw.failMessage)
        : raw.fail_message != null
          ? String(raw.fail_message)
          : null,
    costTime: (() => {
      const value =
        raw.costTime != null
          ? Number(raw.costTime)
          : raw.cost_time != null
            ? Number(raw.cost_time)
            : null;
      return value != null && Number.isFinite(value) ? value : null;
    })(),
    aspectRatio:
      raw.aspectRatio != null
        ? String(raw.aspectRatio)
        : raw.aspect_ratio != null
          ? String(raw.aspect_ratio)
          : null,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),
    template,
  };
}

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
  use_face_asset?: boolean;
}

interface GenerateVideoInput {
  prompt: string;
  video_prompt?: string;
  aspect_ratio?: string;
  images?: string[];
  template_id?: string;
  use_face_asset?: boolean;
}

interface GenerateLarpResponse {
  id: string;
  taskId: string;
  status: string;
  estimatedSeconds?: number | null;
}

interface LarpStatusResponse {
  larpId: string;
  status: "waiting" | "success" | "fail";
  resultUrls: string[];
  watermarkedUrls?: string[];
  failMessage: string | null;
  costTime: number | null;
  estimatedSeconds?: number | null;
  qaRetryCount?: number;
  remainingSeconds?: number | null;
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
  costTime: number | null;
  aspectRatio: string | null;
  createdAt: string;
  updatedAt: string;
  template: { name: string; nameEn?: string | null; category: string | null } | null;
}

export interface AdminGenerationLogItem {
  id: string;
  userId: string;
  userEmail: string | null;
  generationType: "image" | "video";
  status: "waiting" | "success" | "fail";
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  costTime: number | null;
  failMessage: string | null;
  template: { name: string; nameEn?: string | null; category: string | null } | null;
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
      queryClient.invalidateQueries({ queryKey: ["stripe", "current-plan"] });
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
      queryClient.invalidateQueries({ queryKey: ["stripe", "current-plan"] });
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
    // A generation can keep running on the server even if a single poll fails
    // (transient 5xx, network blip). Retry hard before surfacing an error, but
    // never retry client errors (404 task not found, 403) — they won't recover.
    retry: (failureCount, err) => {
      const status = (err as { status?: number } | null)?.status;
      if (typeof status === "number" && status >= 400 && status < 500) {
        return false;
      }
      return failureCount < 8;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    // Keep polling even while in an error state so a transient failure
    // recovers automatically once the server responds again.
    refetchIntervalInBackground: true,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "fail") return false;
      if (data?.status === "success" && (data.resultUrls?.length ?? 0) > 0) {
        return false;
      }
      const remaining = data?.remainingSeconds;
      if (typeof remaining === "number" && remaining <= 8) return 400;
      if ((data?.qaRetryCount ?? 0) > 0) return 600;
      return 800;
    },
  });
}

const HISTORY_PAGE_SIZE = 40;

type LarpHistoryPage = {
  items: LarpHistoryItem[];
  hasMore: boolean;
  nextOffset: number;
  total: number;
};

function parseHistoryPage(body: unknown, requestedOffset: number): LarpHistoryPage {
  // Backward compatible: old API returned a bare array (capped at 50).
  if (Array.isArray(body)) {
    const items = body.map((item) =>
      normalizeHistoryItem(
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {},
      ),
    );
    return {
      items,
      hasMore: false,
      nextOffset: requestedOffset + items.length,
      total: items.length,
    };
  }

  const payload =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const items = rawItems.map((item) =>
    normalizeHistoryItem(
      item && typeof item === "object" ? (item as Record<string, unknown>) : {},
    ),
  );
  const nextOffset =
    typeof payload.nextOffset === "number"
      ? payload.nextOffset
      : requestedOffset + items.length;
  const total =
    typeof payload.total === "number" ? payload.total : nextOffset;
  const hasMore =
    typeof payload.hasMore === "boolean"
      ? payload.hasMore
      : nextOffset < total;

  return { items, hasMore, nextOffset, total };
}

export function useLarpHistory() {
  const { user } = useAuth();

  const query = useInfiniteQuery({
    queryKey: ["larp-history", user?.id ?? "anonymous"],
    queryFn: async ({ pageParam }) => {
      const offset = typeof pageParam === "number" ? pageParam : 0;
      const params = new URLSearchParams({
        limit: String(HISTORY_PAGE_SIZE),
        offset: String(offset),
      });
      const res = await authFetch(`/api/larps/history?${params.toString()}`);
      const body = await res.json();
      return parseHistoryPage(body, offset);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextOffset : undefined,
    enabled: Boolean(user?.id),
    refetchOnMount: "always",
    staleTime: 0,
  });

  const data = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  return {
    ...query,
    data,
    isPending: query.isPending,
    isLoading: query.isPending,
    isError: query.isError,
    isFetching: query.isFetching,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: Boolean(query.hasNextPage),
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

export function useAdminGenerationLogs(options?: { enabled?: boolean }) {
  return useQuery<AdminGenerationLogItem[]>({
    queryKey: ["admin-generation-logs"],
    queryFn: async () => {
      const res = await authFetch(api.admin.generationLogs.path);
      return res.json();
    },
    enabled: options?.enabled ?? true,
  });
}

export function useClearAdminGenerationLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await authFetch(api.admin.clearGenerationLogs.path, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.message === "string"
            ? body.message
            : "Failed to clear logs",
        );
      }
      return res.json() as Promise<{ deletedCount: number }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-generation-logs"] });
      queryClient.invalidateQueries({ queryKey: ["larp-history"] });
    },
  });
}

export function useDeleteLarp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (larpId: string) => {
      try {
        const res = await authFetch(
          `/api/larps/${encodeURIComponent(larpId)}`,
          {
            method: "DELETE",
          },
        );
        try {
          return await res.json();
        } catch {
          return { success: true };
        }
      } catch (error: any) {
        // Already gone / false 404 after a successful delete → treat as success.
        if (error?.status === 404) {
          return { success: true, alreadyGone: true };
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["larp-history"] });
    },
  });
}

export function useDeleteLarps() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (larpIds: string[]) => {
      const uniqueIds = [...new Set(larpIds.filter(Boolean))];
      if (uniqueIds.length === 0) {
        return { deleted: 0, failed: 0 };
      }

      const results = await Promise.allSettled(
        uniqueIds.map(async (larpId) => {
          try {
            await authFetch(`/api/larps/${encodeURIComponent(larpId)}`, {
              method: "DELETE",
            });
            return larpId;
          } catch (error: any) {
            if (error?.status === 404) return larpId;
            throw error;
          }
        }),
      );

      const deleted = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - deleted;
      if (deleted === 0 && failed > 0) {
        throw new Error("delete_failed");
      }
      return { deleted, failed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["larp-history"] });
    },
  });
}
