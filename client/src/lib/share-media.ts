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

/**
 * Snapchat / Instagram handle JPEG more reliably than huge 4K PNGs in the
 * system share sheet. Download keeps the original; share gets a social-friendly copy.
 */
async function toSocialShareFile(
  blob: Blob,
  isVideo: boolean,
): Promise<File> {
  const ext = inferDownloadExtension(blob, {
    resultType: isVideo ? "video" : "image",
  });

  if (isVideo || !blob.type.startsWith("image/")) {
    const mime =
      blob.type ||
      `video/${ext === "mov" ? "quicktime" : ext === "webm" ? "webm" : "mp4"}`;
    return new File([blob], randomLarpDownloadName(ext), { type: mime });
  }

  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no_canvas");
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (out) => (out ? resolve(out) : reject(new Error("toBlob_failed"))),
        "image/jpeg",
        0.95,
      );
    });

    return new File([jpegBlob], randomLarpDownloadName("jpg"), {
      type: "image/jpeg",
    });
  } catch {
    const mime = blob.type || (ext === "png" ? "image/png" : "image/jpeg");
    return new File([blob], randomLarpDownloadName(ext), { type: mime });
  }
}

async function tryNativeFileShare(file: File): Promise<"shared" | "cancelled" | "unsupported"> {
  if (typeof navigator.share !== "function") return "unsupported";

  try {
    if (typeof navigator.canShare === "function") {
      if (!navigator.canShare({ files: [file] })) return "unsupported";
    }
    await navigator.share({
      files: [file],
      title: "LuxeFlexIA",
      text: "Créé avec LuxeFlexIA",
    });
    return "shared";
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return "cancelled";
    // Some browsers throw NotAllowedError / DataError — treat as unsupported.
    return "unsupported";
  }
}

function openWhatsApp(assetUrl?: string | null) {
  const href = assetUrl
    ? `https://api.whatsapp.com/send?text=${encodeURIComponent(assetUrl)}`
    : "https://api.whatsapp.com/send";
  window.open(href, "_blank", "noopener,noreferrer");
}

/**
 * Deep-link into the native app on phones only.
 * Never window.open() custom schemes on desktop — that creates a black blank tab.
 */
function openNativeAppScheme(platform: Exclude<SharePlatform, "whatsapp">) {
  if (!isMobileUa()) return false;

  const schemes: Record<Exclude<SharePlatform, "whatsapp">, string> = {
    snapchat: "snapchat://camera",
    instagram: "instagram://app",
    tiktok: "tiktok://",
  };

  try {
    // Same-tab deep link avoids a black empty popup tab.
    window.location.href = schemes[platform];
    return true;
  } catch {
    return false;
  }
}

/**
 * Share a generated asset to Snapchat / IG / WhatsApp / TikTok.
 *
 * Reality on the web: only the OS share sheet with a file can open Snapchat
 * with the photo already attached. Custom schemes cannot inject an image, and
 * opening them on desktop produces a black blank page — so we never do that.
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

  const file = await toSocialShareFile(blob, isVideo);

  // 1) System share sheet with the photo attached (Snapchat appears here on phones).
  const shareResult = await tryNativeFileShare(file);
  if (shareResult === "shared" || shareResult === "cancelled") {
    return shareResult;
  }

  // 2) WhatsApp can fall back to a URL on any device.
  if (options.platform === "whatsapp") {
    openWhatsApp(options.assetUrl);
    return "opened-app";
  }

  // 3) Save the original full-quality file so it's in Downloads / Photos.
  const originalExt = inferDownloadExtension(blob, {
    resultType: isVideo ? "video" : "image",
    url: options.assetUrl ?? undefined,
  });
  try {
    const saved = await saveMediaBlob(blob, randomLarpDownloadName(originalExt), {
      resultType: isVideo ? "video" : "image",
      fallbackUrl: options.assetUrl ?? undefined,
    });
    if (saved === "aborted") return "cancelled";
  } catch {
    /* still continue with guidance */
  }

  // 4) On phones only, try to bring Snapchat/IG to the foreground (no photo inject).
  //    Never open snapchat:// or snapchat.com on desktop — black screen bug.
  if (isMobileUa()) {
    openNativeAppScheme(options.platform);
  }

  return "saved-guide";
}
