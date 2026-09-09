import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import {
  releaseGenerationSubmitLockOnError,
  tryAcquireGenerationSubmitLock,
} from "@/lib/generation-submit-lock";
import { createGenerationRequestId } from "@/lib/generation-request-id";
import type {
  SubtitlePosition,
  SubtitleStyle,
  VideoAspectRatio,
  VideoCameraMovement,
  VideoDuration,
  VideoMotionIntensity,
  VideoQuality,
  VideoStyle,
  VideoWorkflow,
} from "@/lib/video-studio-config";

export interface VideoStudioGenerateInput {
  workflow: VideoWorkflow;
  motion_prompt?: string;
  duration_sec?: VideoDuration;
  aspect_ratio?: VideoAspectRatio;
  camera_movement?: VideoCameraMovement;
  motion_intensity?: VideoMotionIntensity;
  style?: VideoStyle;
  quality?: VideoQuality;
  image_url?: string;
  source_larp_id?: string;
  images?: string[];
  videos?: string[];
  video_url?: string;
  vehicle_preset?: string;
  vehicle_prompt?: string;
  source_video_duration_sec?: number;
  reference_images?: string[];
  reference_image_url?: string;
  voice_enabled?: boolean;
  voice_mode?: "cloned" | "catalog" | "none";
  voice_clone_id?: string;
  voice_text?: string;
  voice_consent?: boolean;
  subtitles_enabled?: boolean;
  subtitle_style?: SubtitleStyle;
  subtitle_position?: SubtitlePosition;
  overlay_text?: string;
  video_request_id?: string;
  source?: string;
}

export interface VideoStudioGenerateResponse {
  id: string;
  taskId: string;
  status: string;
  estimatedSeconds?: number | null;
  createdAt?: string | null;
  videoRequestId?: string;
  creditCost?: number;
  deduplicated?: boolean;
  generationType?: "video";
}

export function useVideoStudioGenerate() {
  const queryClient = useQueryClient();
  return useMutation<VideoStudioGenerateResponse, Error, VideoStudioGenerateInput>({
    mutationFn: async (data) => {
      if (!tryAcquireGenerationSubmitLock()) {
        throw new Error("Une génération est déjà en cours. Patiente quelques secondes.");
      }

      const videoRequestId = data.video_request_id || createGenerationRequestId();
      const payload = {
        ...data,
        video_request_id: videoRequestId,
        frontend_timestamp: new Date().toISOString(),
        click_count: 1,
        source: data.source || "video_studio",
      };

      try {
        const res = await authFetch("/api/larps/generate-video", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as VideoStudioGenerateResponse;
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
  });
}
