import type { LucideIcon } from "lucide-react";
import { ImageIcon, Wand2 } from "lucide-react";
import type { VideoWorkflow } from "@/lib/video-studio-config";

export type VideoStudioMode = VideoWorkflow;

export type VideoStudioModeOption = {
  id: VideoStudioMode;
  label: string;
  hint: string;
  icon: LucideIcon;
};

/** Deux entrées client — Vidéo→Vidéo route en interne 2 moteurs selon le prompt. */
export const VIDEO_STUDIO_MODE_OPTIONS: VideoStudioModeOption[] = [
  {
    id: "image_to_video",
    label: "Image → Vidéo",
    hint: "Anime ta photo · 3–5 s · voix optionnelle",
    icon: ImageIcon,
  },
  {
    id: "video_to_video",
    label: "Vidéo → Vidéo",
    hint: "Mouvement ou scène luxe — tu choisis, le studio exécute",
    icon: Wand2,
  },
];

export function pathForVideoStudioMode(
  mode: VideoStudioMode,
  v2vIntent?: "motion" | "scene" | null,
): string {
  const workflow =
    mode === "video_to_video" ? "video_to_video" : "image_to_video";
  if (mode === "video_to_video" && v2vIntent) {
    return `/video-ia?workflow=${workflow}&intent=${v2vIntent}`;
  }
  return `/video-ia?workflow=${workflow}`;
}
