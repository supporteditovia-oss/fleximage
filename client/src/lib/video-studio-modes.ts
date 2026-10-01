import type { LucideIcon } from "lucide-react";
import { Crown, ImageIcon, Video, Wand2 } from "lucide-react";
import type { VideoWorkflow } from "@/lib/video-studio-config";

/** Modes visibles dans le studio Vidéo IA (+ page Transformation Pro). */
export type VideoStudioMode = VideoWorkflow | "transformation_pro";

export type VideoStudioModeOption = {
  id: VideoStudioMode;
  label: string;
  hint: string;
  icon: LucideIcon;
};

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
    hint: "Décor, corps, tenue, danse · 720p–4K",
    icon: Wand2,
  },
  {
    id: "transformation_pro",
    label: "Transformation Pro",
    hint: "Luxe & décor · ta voix conservée · payé si OK",
    icon: Crown,
  },
];

export function isVideoWorkflow(mode: VideoStudioMode): mode is VideoWorkflow {
  return mode === "image_to_video" || mode === "video_to_video";
}

export function videoStudioModeFromPath(pathname: string): VideoStudioMode {
  if (
    pathname === "/transformation-pro" ||
    pathname.startsWith("/transformation-pro/")
  ) {
    return "transformation_pro";
  }
  return "image_to_video";
}

export function pathForVideoStudioMode(mode: VideoStudioMode): string {
  if (mode === "transformation_pro") return "/transformation-pro";
  const workflow = mode === "video_to_video" ? "video_to_video" : "image_to_video";
  return `/video-ia?workflow=${workflow}`;
}
