import { authFetch } from "@/lib/api";

type PresignedVideoUpload = {
  uploadUrl: string;
  videoUrl: string;
  key: string;
};

export async function uploadVideoFileForStudio(file: File): Promise<string> {
  const contentType = file.type || "video/mp4";
  const res = await authFetch("/api/larps/video-upload-url", {
    method: "POST",
    body: JSON.stringify({
      contentType,
      fileSizeBytes: file.size,
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message || "Impossible de préparer l'upload vidéo");
  }

  const { uploadUrl, videoUrl } = (await res.json()) as PresignedVideoUpload;
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(
      "Envoi de la vidéo refusé. Réessaie ou filme en 1080p (pas 4K).",
    );
  }

  return videoUrl;
}

export function formatVideoSizeMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}
