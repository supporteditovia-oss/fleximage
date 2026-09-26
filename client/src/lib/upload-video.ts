import { authFetch } from "@/lib/api";
import {
  fileToVideoDataUrl,
  resolveVideoMimeType,
  withNormalizedVideoFile,
} from "@/lib/media-file-detect";

/** Sous ce seuil, repli base64 via l'API si l'upload direct R2 échoue (CORS mobile). */
export const VIDEO_INLINE_FALLBACK_MAX_BYTES = 18 * 1024 * 1024;

const R2_PUT_TIMEOUT_MS = 45_000;

type PresignedVideoUpload = {
  uploadUrl: string;
  videoUrl: string;
  key: string;
};

export type StudioVideoUpload =
  | { mode: "url"; videoUrl: string }
  | { mode: "inline"; dataUrl: string };

function isMobileUploadUa(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

async function uploadVideoDirectToR2(file: File): Promise<string> {
  const normalized = withNormalizedVideoFile(file);
  const contentType = resolveVideoMimeType(normalized);
  const res = await authFetch("/api/larps/video-upload-url", {
    method: "POST",
    body: JSON.stringify({
      contentType,
      fileSizeBytes: normalized.size,
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message || "Impossible de préparer l'upload vidéo");
  }

  const { uploadUrl, videoUrl } = (await res.json()) as PresignedVideoUpload;
  let putRes: Response;
  try {
    putRes = await fetchWithTimeout(
      uploadUrl,
      {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: normalized,
      },
      R2_PUT_TIMEOUT_MS,
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("UPLOAD_DIRECT_FAILED");
    }
    throw err;
  }

  if (!putRes.ok) {
    throw new Error("UPLOAD_DIRECT_FAILED");
  }

  return videoUrl;
}

const INLINE_READ_TIMEOUT_MS = 90_000;

async function uploadInlineDataUrl(file: File): Promise<StudioVideoUpload> {
  const normalized = withNormalizedVideoFile(file);
  const dataUrl = await Promise.race([
    fileToVideoDataUrl(normalized),
    new Promise<string>((_, reject) => {
      window.setTimeout(
        () => reject(new Error("UPLOAD_INLINE_TIMEOUT")),
        INLINE_READ_TIMEOUT_MS,
      );
    }),
  ]);
  return { mode: "inline", dataUrl };
}

export async function prepareVideoFileForStudio(
  file: File,
): Promise<StudioVideoUpload> {
  const normalized = withNormalizedVideoFile(file);
  const canInline = normalized.size <= VIDEO_INLINE_FALLBACK_MAX_BYTES;

  // iPhone / Android : évite le PUT R2 qui reste souvent bloqué (CORS / réseau).
  if (canInline && isMobileUploadUa()) {
    try {
      return await uploadInlineDataUrl(normalized);
    } catch {
      /* repli R2 ci-dessous */
    }
  }

  try {
    const videoUrl = await uploadVideoDirectToR2(normalized);
    return { mode: "url", videoUrl };
  } catch (directErr) {
    if (canInline) {
      try {
        return await uploadInlineDataUrl(normalized);
      } catch {
        /* message d'erreur ci-dessous */
      }
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
