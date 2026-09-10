import {
  VIDEO_V2V_MAX_DURATION_SEC,
  VIDEO_V2V_MAX_DURATION_SLACK_SEC,
  VIDEO_V2V_MIN_DURATION_SEC,
} from "@/lib/video-studio-config";

export function readVideoDurationSec(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("Durée vidéo illisible"));
        return;
      }
      resolve(duration);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Impossible de lire la vidéo"));
    };

    video.src = url;
  });
}

export function getVideoDurationUploadLimitSec(): number {
  return VIDEO_V2V_MAX_DURATION_SEC + VIDEO_V2V_MAX_DURATION_SLACK_SEC;
}

/** Affichage lisible — évite d'afficher 9s pour une vidéo metadata 8,03s. */
export function formatVideoDurationLabel(durationSec: number): string {
  const rounded = Math.round(durationSec * 10) / 10;
  if (rounded <= VIDEO_V2V_MAX_DURATION_SEC + 0.05) {
    return String(Math.min(VIDEO_V2V_MAX_DURATION_SEC, Math.round(rounded)));
  }
  return rounded.toFixed(1).replace(".0", "");
}

export function validateVideoDurationForUpload(durationSec: number): {
  ok: boolean;
  message?: string;
} {
  if (durationSec < VIDEO_V2V_MIN_DURATION_SEC) {
    return {
      ok: false,
      message: `Vidéo trop courte (minimum ${VIDEO_V2V_MIN_DURATION_SEC}s).`,
    };
  }
  if (durationSec > getVideoDurationUploadLimitSec()) {
    const detected = formatVideoDurationLabel(durationSec);
    return {
      ok: false,
      message: `Vidéo trop longue (${detected}s détectées — maximum ${VIDEO_V2V_MAX_DURATION_SEC}s). Coupe ta vidéo avant import.`,
    };
  }
  return { ok: true };
}
