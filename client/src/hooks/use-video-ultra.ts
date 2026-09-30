import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import {
  releaseGenerationSubmitLock,
  releaseGenerationSubmitLockOnError,
  tryAcquireGenerationSubmitLockOrRecover,
} from "@/lib/generation-submit-lock";
import {
  clearInFlightGeneration,
  getInFlightGeneration,
} from "@/lib/in-flight-generation";
import { createGenerationRequestId } from "@/lib/generation-request-id";
import type {
  VideoUltraDurationSec,
  VideoUltraResolution,
} from "@shared/video-ultra-pricing";

export interface VideoUltraGenerateInput {
  prompt: string;
  duration_sec: VideoUltraDurationSec;
  resolution: VideoUltraResolution;
  videos?: string[];
  video_url?: string;
  source_video_duration_sec?: number;
  video_request_id?: string;
  source?: string;
}

export interface VideoUltraGenerateResponse {
  id: string;
  taskId: string;
  status: string;
  estimatedSeconds?: number | null;
  createdAt?: string | null;
  videoRequestId?: string;
  creditCost?: number;
  deduplicated?: boolean;
  generationType?: "video";
  workflow?: "video_ultra";
}

export function useVideoUltraGenerate() {
  const queryClient = useQueryClient();
  return useMutation<VideoUltraGenerateResponse, Error, VideoUltraGenerateInput>(
    {
      mutationFn: async (data) => {
        clearInFlightGeneration();
        const activeInFlight = getInFlightGeneration();
        if (
          !tryAcquireGenerationSubmitLockOrRecover(Boolean(activeInFlight?.taskId))
        ) {
          throw new Error(
            "Une génération est déjà en cours. Patiente quelques secondes.",
          );
        }

        const videoRequestId =
          data.video_request_id || createGenerationRequestId();
        const payload = {
          ...data,
          video_request_id: videoRequestId,
          frontend_timestamp: new Date().toISOString(),
          source: data.source || "video_ultra",
        };

        try {
          const controller = new AbortController();
          const abortTimer = window.setTimeout(() => controller.abort(), 180_000);
          let res: Response;
          try {
            res = await authFetch("/api/larps/generate-video-ultra", {
              method: "POST",
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
          } finally {
            window.clearTimeout(abortTimer);
          }
          const json = (await res.json()) as VideoUltraGenerateResponse & {
            message?: string;
          };
          if (!res.ok) {
            throw new Error(json.message || "Transformation impossible");
          }
          if (json?.taskId) {
            releaseGenerationSubmitLock();
          }
          return { ...json, videoRequestId };
        } catch (err) {
          releaseGenerationSubmitLockOnError();
          throw err;
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["larp-history"] });
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["stripe", "current-plan"] });
      },
    },
  );
}
