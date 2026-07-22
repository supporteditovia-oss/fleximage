import { authFetch } from "@/lib/api";
import {
  assertMediaBlob,
  inferDownloadExtension,
  randomLarpDownloadName,
  saveMediaBlob,
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

async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      return false;
    }
    const type = blob.type && blob.type.startsWith("image/")
      ? blob.type
      : "image/png";
    const item = new ClipboardItem({ [type]: blob });
    await navigator.clipboard.write([item]);
    return true;
  } catch {
    return false;
  }
}

function openPlatformApp(platform: SharePlatform, assetUrl?: string | null) {
  const encoded = assetUrl ? encodeURIComponent(assetUrl) : "";

  const targets: Record<SharePlatform, string[]> = {
    whatsapp: [
      assetUrl
        ? `https://api.whatsapp.com/send?text=${encoded}`
        : "https://api.whatsapp.com/send",
      "whatsapp://send",
    ],
    // Prefer camera / preview entry points when possible
    snapchat: [
      "snapchat://camera",
      "snapchat://",
      "https://www.snapchat.com/add",
      "https://www.snapchat.com/",
    ],
    instagram: [
      "instagram://share",
      "instagram://library",
      "instagram://app",
      "https://www.instagram.com/",
    ],
    tiktok: ["tiktok://", "https://www.tiktok.com/"],
  };

  for (const href of targets[platform]) {
    try {
      if (isMobileUa() && href.includes("://") && !href.startsWith("http")) {
        window.location.href = href;
        return true;
      }
      const opened = window.open(href, "_blank", "noopener,noreferrer");
      if (opened) return true;
      if (href.includes("://") && !href.startsWith("http")) {
        window.location.href = href;
        return true;
      }
    } catch {
      /* try next */
    }
  }
  return false;
}

/**
 * Share a generated asset so the photo can be sent from Snapchat / IG / etc.
 *
 * On phones, Web Share with the file is the only reliable way to open Snapchat
 * with the generated photo already attached (user picks Snapchat in the sheet).
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
  const mime =
    blob.type ||
    (isVideo
      ? `video/${ext === "mov" ? "quicktime" : ext}`
      : ext === "png"
        ? "image/png"
        : "image/jpeg");
  const file = new File([blob], randomLarpDownloadName(ext), { type: mime });

  // 1) Native share sheet WITH the file attached.
  //    Choosing Snapchat / Instagram / WhatsApp there sends the photo directly.
  if (typeof navigator.share === "function" && typeof navigator.canShare === "function") {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "LuxeFlexIA",
          text: "Créé avec LuxeFlexIA",
        });
        return "shared";
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  // 2) WhatsApp URL fallback
  if (options.platform === "whatsapp" && options.assetUrl) {
    openPlatformApp("whatsapp", options.assetUrl);
    return "opened-app";
  }

  // 3) Save full-quality file (+ clipboard when possible), then jump into the app.
  try {
    const saved = await saveMediaBlob(blob, randomLarpDownloadName(ext), {
      resultType: isVideo ? "video" : "image",
      fallbackUrl: options.assetUrl ?? undefined,
    });
    if (saved === "aborted") return "cancelled";
  } catch {
    /* still try to open the app */
  }

  if (!isVideo) {
    await copyImageToClipboard(blob);
  }

  openPlatformApp(options.platform, options.assetUrl);
  return "saved-guide";
}
