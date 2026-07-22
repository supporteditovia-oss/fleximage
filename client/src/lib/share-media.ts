import { authFetch } from "@/lib/api";
import {
  assertMediaBlob,
  inferDownloadExtension,
  randomLarpDownloadName,
  triggerBlobDownload,
} from "@/lib/download-media";

export type SharePlatform = "whatsapp" | "snapchat" | "instagram" | "tiktok";

export type ShareMediaOptions = {
  larpId: string;
  imageIndex?: number;
  assetUrl?: string | null;
  resultType?: "image" | "video";
  platform: SharePlatform;
  /** Prefetched blob keeps the share inside the user-gesture window on mobile. */
  blob?: Blob | null;
};

export type ShareMediaOutcome =
  | "shared"
  | "opened-app"
  | "saved-guide"
  | "cancelled";

function isVideoUrl(url: string | null | undefined): boolean {
  return Boolean(url && /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url));
}

function isMobileUa(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
}

/** Clear stuck Vaul/Radix black overlays after the share drawer closes. */
export function cleanupShareUiLocks() {
  if (typeof document === "undefined") return;
  document.body.style.removeProperty("pointer-events");
  document.body.style.removeProperty("overflow");
  document.documentElement.style.removeProperty("overflow");
  document.querySelectorAll("[data-vaul-overlay]").forEach((node) => {
    node.parentElement?.removeChild(node);
  });
  document.querySelectorAll("[data-radix-dialog-overlay]").forEach((node) => {
    if (node instanceof HTMLElement && node.dataset.state === "open") return;
    node.parentElement?.removeChild(node);
  });
}

export async function fetchShareBlob(
  larpId: string,
  imageIndex: number,
  assetUrl?: string | null,
): Promise<Blob> {
  try {
    const res = await authFetch(
      `/api/larps/${encodeURIComponent(larpId)}/download/${imageIndex}`,
    );
    const blob = await res.blob();
    assertMediaBlob(blob);
    return blob;
  } catch {
    /* fall through */
  }

  if (assetUrl) {
    const res = await fetch(assetUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    assertMediaBlob(blob);
    return blob;
  }

  throw new Error("empty");
}

function openWhatsApp(assetUrl?: string | null) {
  const href = assetUrl
    ? `https://api.whatsapp.com/send?text=${encodeURIComponent(assetUrl)}`
    : "https://api.whatsapp.com/send";
  window.open(href, "_blank", "noopener,noreferrer");
}

/**
 * Open Snapchat / Instagram / TikTok without navigating the page to a black screen.
 * Uses a hidden <a> click instead of location.href / window.open.
 */
function openNativeApp(platform: Exclude<SharePlatform, "whatsapp">): boolean {
  if (!isMobileUa()) return false;

  const schemes: Record<Exclude<SharePlatform, "whatsapp">, string[]> = {
    snapchat: ["snapchat://camera", "snapchat://"],
    instagram: ["instagram://app", "instagram://share"],
    tiktok: ["tiktok://"],
  };

  for (const href of schemes[platform]) {
    try {
      const a = document.createElement("a");
      a.href = href;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

async function tryWhatsAppFileShare(file: File): Promise<"shared" | "cancelled" | "unsupported"> {
  if (typeof navigator.share !== "function") return "unsupported";
  try {
    if (typeof navigator.canShare === "function" && !navigator.canShare({ files: [file] })) {
      return "unsupported";
    }
    await navigator.share({
      files: [file],
      title: "LuxeFlexIA",
    });
    return "shared";
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return "cancelled";
    return "unsupported";
  }
}

/**
 * Share to a chosen platform.
 *
 * Snapchat / Instagram / TikTok: NEVER open the OS multi-app share sheet
 * (that was the black box + list of apps). Instead: save the photo, then
 * open the app directly on phones.
 */
export async function shareMediaToPlatform(
  options: ShareMediaOptions,
): Promise<ShareMediaOutcome> {
  const imageIndex = options.imageIndex ?? 0;
  const isVideo =
    options.resultType === "video" || isVideoUrl(options.assetUrl);

  const blob =
    options.blob && options.blob.size > 0
      ? options.blob
      : await fetchShareBlob(options.larpId, imageIndex, options.assetUrl);

  assertMediaBlob(blob);

  const ext = inferDownloadExtension(blob, {
    resultType: isVideo ? "video" : "image",
    url: options.assetUrl ?? undefined,
  });
  const filename = randomLarpDownloadName(ext);
  const mime =
    blob.type ||
    (isVideo
      ? `video/${ext === "mov" ? "quicktime" : ext}`
      : ext === "png"
        ? "image/png"
        : "image/jpeg");
  const file = new File([blob], filename, { type: mime });

  // WhatsApp: OS share with file is useful; URL fallback otherwise.
  if (options.platform === "whatsapp") {
    const shared = await tryWhatsAppFileShare(file);
    if (shared === "shared" || shared === "cancelled") return shared;
    openWhatsApp(options.assetUrl);
    return "opened-app";
  }

  // Snapchat / Instagram / TikTok — direct path (no system app picker).
  // Use triggerBlobDownload only: saveMediaBlob would reopen the iOS share sheet.
  triggerBlobDownload(blob, filename);

  const opened = openNativeApp(options.platform);
  return opened ? "opened-app" : "saved-guide";
}
