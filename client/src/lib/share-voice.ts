import { authFetch } from "@/lib/api";
import { cleanupShareUiLocks } from "@/lib/share-media";
import { triggerBlobDownload } from "@/lib/download-media";

export type VoiceSharePlatform = "whatsapp" | "telegram" | "more";

export type VoiceShareOutcome = "shared" | "opened-app" | "saved" | "cancelled";

function isMobileUa(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
}

function isAndroidUa(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

function isIosUa(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

function voiceShareFileName() {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+/, "")
    .slice(0, 15);
  return `PTT-${stamp}.mp3`;
}

function extractGenerationId(audioUrl: string, generationId?: string): string | null {
  if (generationId) return generationId;
  const match = audioUrl.match(/voice-generations\/[^/]+\/([a-f0-9-]{36})\.mp3/i);
  return match?.[1] ?? null;
}

export function toVoiceShareFile(blob: Blob): File {
  const type = blob.type && blob.type.startsWith("audio/") ? blob.type : "audio/mpeg";
  return new File([blob], voiceShareFileName(), { type });
}

export async function fetchVoiceBlob(
  audioUrl: string,
  generationId?: string,
): Promise<Blob> {
  const id = extractGenerationId(audioUrl, generationId);
  if (id) {
    const res = await authFetch(`/api/larps/voice/download?id=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (!blob.size) throw new Error("empty_audio");
    return blob;
  }

  try {
    const res = await fetch(audioUrl, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (!blob.size) throw new Error("empty_audio");
    return blob;
  } catch {
    const res = await authFetch(audioUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (!blob.size) throw new Error("empty_audio");
    return blob;
  }
}

function clickHref(href: string) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/**
 * Android : ouvre WhatsApp / Telegram directement avec l’audio (sans menu « Partager »).
 * Même technique que Snapchat côté images — URL publique https du MP3.
 */
function tryAndroidDirectAppShare(
  publicAudioUrl: string,
  packageName: string,
): boolean {
  if (!isAndroidUa() || !publicAudioUrl.startsWith("http")) return false;
  try {
    const encoded = encodeURIComponent(publicAudioUrl);
    clickHref(
      `intent:#Intent;action=android.intent.action.SEND;type=audio/mpeg;package=${packageName};S.android.intent.extra.STREAM=${encoded};end`,
    );
    return true;
  } catch {
    return false;
  }
}

async function tryNativeFileShare(
  file: File,
): Promise<"shared" | "cancelled" | "unsupported"> {
  if (typeof navigator.share !== "function") return "unsupported";

  const payload: ShareData = {
    files: [file],
    title: "Vocal LuxeFlexIA",
  };

  try {
    if (typeof navigator.canShare === "function") {
      try {
        if (!navigator.canShare({ files: [file] })) {
          return "unsupported";
        }
      } catch {
        /* ignore */
      }
    }
    await navigator.share(payload);
    return "shared";
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return "cancelled";
    return "unsupported";
  }
}

/**
 * Partage vocal — WhatsApp/Telegram direct sur Android quand possible.
 */
export async function shareVoiceAudio(options: {
  audioUrl: string;
  generationId?: string;
  blob?: Blob | null;
  platform: VoiceSharePlatform;
}): Promise<VoiceShareOutcome> {
  const blob =
    options.blob && options.blob.size > 0
      ? options.blob
      : await fetchVoiceBlob(options.audioUrl, options.generationId);

  const file = toVoiceShareFile(blob);
  const publicUrl = options.audioUrl.startsWith("http") ? options.audioUrl : "";

  if (options.platform === "whatsapp") {
    if (publicUrl && tryAndroidDirectAppShare(publicUrl, "com.whatsapp")) {
      cleanupShareUiLocks();
      return "opened-app";
    }

    if (isMobileUa()) {
      const shared = await tryNativeFileShare(file);
      if (shared === "shared" || shared === "cancelled") {
        cleanupShareUiLocks();
        return shared;
      }
    }

    if (isIosUa()) {
      window.location.href = "whatsapp://";
    } else {
      window.open("https://web.whatsapp.com/", "_blank", "noopener,noreferrer");
    }
    triggerBlobDownload(blob, file.name);
    cleanupShareUiLocks();
    return "opened-app";
  }

  if (options.platform === "telegram") {
    if (publicUrl && tryAndroidDirectAppShare(publicUrl, "org.telegram.messenger")) {
      cleanupShareUiLocks();
      return "opened-app";
    }

    if (isMobileUa()) {
      const shared = await tryNativeFileShare(file);
      if (shared === "shared" || shared === "cancelled") {
        cleanupShareUiLocks();
        return shared;
      }
    }

    if (isIosUa()) {
      window.location.href = "tg://";
    } else {
      window.open("https://web.telegram.org/", "_blank", "noopener,noreferrer");
    }
    triggerBlobDownload(blob, file.name);
    cleanupShareUiLocks();
    return "opened-app";
  }

  if (isMobileUa()) {
    const shared = await tryNativeFileShare(file);
    if (shared === "shared" || shared === "cancelled") {
      cleanupShareUiLocks();
      return shared;
    }
  }

  triggerBlobDownload(blob, file.name);
  return "saved";
}
