import { authFetch } from "@/lib/api";

export const CAR_VIDEO_MIN_DURATION_SEC = 2;
export const CAR_VIDEO_MAX_DURATION_SEC = 8;
export const CAR_VIDEO_MAX_SIZE_MB = 200;

export const CAR_VIDEO_ALLOWED_EXTENSIONS = [".mp4", ".mov", ".webm"];

export type CarVideoPlanType = "exterior" | "interior";

export type CarVideoVehicleId =
  | "luxury_black_suv"
  | "premium_black_sedan"
  | "red_sports"
  | "premium_white_suv";

export type CarVideoInteriorStyle =
  | "black_leather"
  | "beige_leather"
  | "carbon_sport";

export type CarVideoGenerationStatus =
  | "uploaded"
  | "validating"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export const CAR_VIDEO_VEHICLES: {
  id: CarVideoVehicleId;
  label: string;
}[] = [
  { id: "luxury_black_suv", label: "SUV luxe noir" },
  { id: "premium_black_sedan", label: "Berline premium noire" },
  { id: "red_sports", label: "Sportive rouge" },
  { id: "premium_white_suv", label: "SUV premium blanc" },
];

export const CAR_VIDEO_INTERIOR_STYLES: {
  id: CarVideoInteriorStyle;
  label: string;
}[] = [
  { id: "black_leather", label: "Cuir noir" },
  { id: "beige_leather", label: "Cuir beige" },
  { id: "carbon_sport", label: "Carbone sportif" },
];

export function validateCarVideoFile(file: File): { ok: boolean; message?: string } {
  const name = file.name.toLowerCase();
  const extOk = CAR_VIDEO_ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  const mimeOk =
    file.type === "video/mp4" ||
    file.type === "video/quicktime" ||
    file.type === "video/webm" ||
    extOk;
  if (!mimeOk) {
    return {
      ok: false,
      message: "Format non accepté. Utilise MP4, MOV ou WebM.",
    };
  }
  if (file.size > CAR_VIDEO_MAX_SIZE_MB * 1024 * 1024) {
    return {
      ok: false,
      message: `Fichier trop lourd (max ${CAR_VIDEO_MAX_SIZE_MB} Mo).`,
    };
  }
  return { ok: true };
}

export function validateCarVideoDuration(durationSec: number): {
  ok: boolean;
  message?: string;
} {
  if (durationSec < CAR_VIDEO_MIN_DURATION_SEC || durationSec > CAR_VIDEO_MAX_DURATION_SEC) {
    return {
      ok: false,
      message: "La vidéo doit durer entre 2 et 8 secondes.",
    };
  }
  return { ok: true };
}

export function estimateCarVideoCredits(durationSec: number): number {
  const sec = Math.min(
    CAR_VIDEO_MAX_DURATION_SEC,
    Math.max(CAR_VIDEO_MIN_DURATION_SEC, Math.ceil(durationSec)),
  );
  return sec * 12;
}

export async function uploadCarVideoSource(file: File): Promise<string> {
  const contentType =
    file.type === "video/quicktime"
      ? "video/quicktime"
      : file.type || "video/mp4";

  const res = await authFetch("/api/video-generations/upload", {
    method: "POST",
    body: JSON.stringify({
      contentType,
      fileSizeBytes: file.size,
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message || "Upload impossible");
  }
  const { uploadUrl, videoUrl } = (await res.json()) as {
    uploadUrl: string;
    videoUrl: string;
  };

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!put.ok) throw new Error("Échec envoi vidéo vers le stockage");
  return videoUrl;
}

export async function startCarVideoGeneration(input: {
  inputVideoUrl: string;
  durationSeconds: number;
  planType: CarVideoPlanType;
  selectedVehicle: CarVideoVehicleId;
  selectedInteriorStyle?: CarVideoInteriorStyle;
  idempotencyKey: string;
}) {
  const res = await authFetch("/api/video-generations", {
    method: "POST",
    headers: { "Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify({
      inputVideoUrl: input.inputVideoUrl,
      durationSeconds: input.durationSeconds,
      planType: input.planType,
      selectedVehicle: input.selectedVehicle,
      selectedInteriorStyle: input.selectedInteriorStyle,
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message || "Génération impossible");
  }
  return res.json() as Promise<{
    generationId: string;
    status: CarVideoGenerationStatus;
    statusLabel: string;
    durationSeconds: number;
    creditsEstimated: number;
    resolution: string;
  }>;
}

export async function fetchCarVideoGeneration(generationId: string) {
  const res = await authFetch(`/api/video-generations/${generationId}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message || "Statut indisponible");
  }
  return res.json() as Promise<{
    generationId: string;
    status: CarVideoGenerationStatus;
    statusLabel: string;
    durationSeconds: number;
    creditsEstimated: number;
    resolution: string;
    outputVideoUrl?: string;
    errorMessage?: string;
    progress?: number | null;
  }>;
}
