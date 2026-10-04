import { authFetch } from "@/lib/api";
import {
  fileToVideoDataUrl,
  resolveVideoMimeType,
  withNormalizedVideoFile,
} from "@/lib/media-file-detect";

/**
 * Repli base64 si l'upload direct R2 échoue.
 * Plafond bas : Vercel rejette les corps HTTP ~4,5 Mo (vidéo base64 ≈ ×1,33).
 */
export const VIDEO_INLINE_FALLBACK_MAX_BYTES = 3 * 1024 * 1024;

const R2_PUT_TIMEOUT_MS = 45_000;

type PresignedVideoUpload = {
  uploadUrl: string;
  videoUrl: string;
  key: string;
};

export type StudioVideoUpload =
  | { mode: "url"; videoUrl: string }
  | { mode: "inline"; dataUrl: string };

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

const INLINE_READ_TIMEOUT_MS = 45_000;

const PREPARE_VIDEO_SOFT_TIMEOUT_MS = 28_000;

/** Préparation R2 / base64 — abandon silencieux après timeout (reprise au clic Générer). */
export async function prepareVideoFileForStudioWithTimeout(
  file: File,
  timeoutMs = PREPARE_VIDEO_SOFT_TIMEOUT_MS,
): Promise<StudioVideoUpload> {
  return Promise.race([
    prepareVideoFileForStudio(file),
    new Promise<StudioVideoUpload>((_, reject) => {
      window.setTimeout(
        () => reject(new Error("PREPARE_VIDEO_TIMEOUT")),
        timeoutMs,
      );
    }),
  ]);
}

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
        : normalized.size > VIDEO_INLINE_FALLBACK_MAX_BYTES
          ? `Vidéo trop lourde pour l'envoi sécurisé (max ~${Math.round(VIDEO_INLINE_FALLBACK_MAX_BYTES / (1024 * 1024))} Mo sans upload cloud). Filme en 720p ou attends la fin de l'upload.`
          : "Envoi direct refusé. Réessaie en Wi‑Fi ou filme en 720p (pas 4K).";
    throw new Error(message);
  }
}

export function formatVideoSizeMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}
