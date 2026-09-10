import { authFetch } from "@/lib/api";

/** Sous ce seuil, repli base64 via l'API si l'upload direct R2 échoue (CORS mobile). */
export const VIDEO_INLINE_FALLBACK_MAX_BYTES = 18 * 1024 * 1024;

type PresignedVideoUpload = {
  uploadUrl: string;
  videoUrl: string;
  key: string;
};

export type StudioVideoUpload =
  | { mode: "url"; videoUrl: string }
  | { mode: "inline"; dataUrl: string };

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function uploadVideoDirectToR2(file: File): Promise<string> {
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
    throw new Error("UPLOAD_DIRECT_FAILED");
  }

  return videoUrl;
}

export async function prepareVideoFileForStudio(
  file: File,
): Promise<StudioVideoUpload> {
  try {
    const videoUrl = await uploadVideoDirectToR2(file);
    return { mode: "url", videoUrl };
  } catch (directErr) {
    if (file.size <= VIDEO_INLINE_FALLBACK_MAX_BYTES) {
      const dataUrl = await fileToDataUrl(file);
      return { mode: "inline", dataUrl };
    }
    const message =
      directErr instanceof Error && directErr.message !== "UPLOAD_DIRECT_FAILED"
        ? directErr.message
        : "Envoi direct refusé. Filme en 1080p (pas 4K) ou compresse la vidéo avant import.";
    throw new Error(message);
  }
}

export function formatVideoSizeMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}
