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
  /** Prefetched JPEG File for Snapchat — avoids async canvas work after the tap. */
  shareFile?: File | null;
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

function isAndroidUa(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
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

function clickHref(href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function openWhatsApp(assetUrl?: string | null) {
  const href = assetUrl
    ? `https://api.whatsapp.com/send?text=${encodeURIComponent(assetUrl)}`
    : "https://api.whatsapp.com/send";
  window.open(href, "_blank", "noopener,noreferrer");
}

/**
 * Convert to JPEG so Snapchat accepts the file in the system share sheet
 * (huge 4K PNGs often fail silently). Exported so UI can prefetch before tap.
 */
export async function toSnapFriendlyImageFile(blob: Blob): Promise<File> {
  if (!blob.type.startsWith("image/") && blob.type !== "" && !blob.type.includes("octet")) {
    const ext = inferDownloadExtension(blob, { resultType: "image" });
    return new File([blob], randomLarpDownloadName(ext), {
      type: blob.type || "image/jpeg",
    });
  }

  try {
    const bitmap = await createImageBitmap(blob);
    const maxSide = 1920;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no_canvas");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (out) => (out ? resolve(out) : reject(new Error("toBlob_failed"))),
        "image/jpeg",
        0.92,
      );
    });

    return new File([jpegBlob], randomLarpDownloadName("jpg"), {
      type: "image/jpeg",
    });
  } catch {
    return new File([blob], randomLarpDownloadName("jpg"), {
      type: blob.type || "image/jpeg",
    });
  }
}

async function tryNativeFileShare(
  file: File,
): Promise<"shared" | "cancelled" | "unsupported"> {
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
 * Android: send the public image URL straight to Snapchat (no multi-app sheet).
 * When it works, Snapchat opens with the photo ready to send as a Snap.
 */
function tryAndroidSnapchatSend(assetUrl: string): boolean {
  if (!isAndroidUa() || !assetUrl.startsWith("http")) return false;
  try {
    const encoded = encodeURIComponent(assetUrl);
    // Target Snapchat only — ACTION_SEND with the image URL as the stream.
    clickHref(
      `intent:#Intent;action=android.intent.action.SEND;type=image/jpeg;package=com.snapchat.android;S.android.intent.extra.STREAM=${encoded};end`,
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Share to a chosen platform.
 *
 * Snapchat goal: open Snapchat WITH the generated photo already loaded so the
 * user can send it as a Snap (red ring) — not an empty camera.
 *
 * On the web, the reliable way is the OS share sheet with the image file
 * (user taps Snapchat once). Empty snapchat:// launchers cannot inject a photo.
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

  // WhatsApp
  if (options.platform === "whatsapp") {
    const ext = inferDownloadExtension(blob, {
      resultType: isVideo ? "video" : "image",
      url: options.assetUrl ?? undefined,
    });
    const file = new File([blob], randomLarpDownloadName(ext), {
      type: blob.type || (isVideo ? "video/mp4" : "image/jpeg"),
    });
    const shared = await tryNativeFileShare(file);
    if (shared === "shared" || shared === "cancelled") return shared;
    openWhatsApp(options.assetUrl);
    return "opened-app";
  }

  // Snapchat — photo must travel WITH the handoff
  if (options.platform === "snapchat") {
    if (!isVideo) {
      const file =
        options.shareFile && options.shareFile.size > 0
          ? options.shareFile
          : await toSnapFriendlyImageFile(blob);

      // 1) OS share sheet with the file → tap Snapchat → photo is in the Snap.
      if (isMobileUa()) {
        const shared = await tryNativeFileShare(file);
        if (shared === "shared" || shared === "cancelled") return shared;
      }

      // 2) Android: try sending the public CDN URL directly to Snapchat.
      if (options.assetUrl && tryAndroidSnapchatSend(options.assetUrl)) {
        return "opened-app";
      }
    }

    // 3) Last resort: save locally (no empty camera deep-link — that was the bug).
    const ext = inferDownloadExtension(blob, {
      resultType: isVideo ? "video" : "image",
      url: options.assetUrl ?? undefined,
    });
    triggerBlobDownload(blob, randomLarpDownloadName(ext));
    return "saved-guide";
  }

  // Instagram / TikTok — file share when possible, else save.
  {
    const ext = inferDownloadExtension(blob, {
      resultType: isVideo ? "video" : "image",
      url: options.assetUrl ?? undefined,
    });
    const file = isVideo
      ? new File([blob], randomLarpDownloadName(ext), {
          type: blob.type || "video/mp4",
        })
      : await toSnapFriendlyImageFile(blob);

    if (isMobileUa()) {
      const shared = await tryNativeFileShare(file);
      if (shared === "shared" || shared === "cancelled") return shared;
    }

    triggerBlobDownload(blob, randomLarpDownloadName(ext));
    return "saved-guide";
  }
}
