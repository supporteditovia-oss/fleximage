import { authFetch } from "@/lib/api";
import {
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
};

function isVideoUrl(url: string | null | undefined): boolean {
  return Boolean(url && /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url));
}

async function fetchShareBlob(
  larpId: string,
  imageIndex: number,
  assetUrl?: string | null,
): Promise<Blob> {
  try {
    const res = await authFetch(
      `/api/larps/${encodeURIComponent(larpId)}/download/${imageIndex}`,
    );
    const blob = await res.blob();
    if (blob && blob.size > 0) return blob;
  } catch {
    /* fall through */
  }

  if (assetUrl) {
    const res = await fetch(assetUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (blob && blob.size > 0) return blob;
  }

  throw new Error("empty");
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
    snapchat: ["snapchat://", "https://www.snapchat.com/"],
    instagram: ["instagram://app", "https://www.instagram.com/"],
    tiktok: ["tiktok://", "https://www.tiktok.com/"],
  };

  for (const href of targets[platform]) {
    try {
      const opened = window.open(href, "_blank", "noopener,noreferrer");
      if (opened) return true;
      // Some mobile browsers block window.open — try location as last resort for app schemes
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
 * Share a generated asset to a social app.
 * On mobile, prefers the native share sheet with the file (Snapchat / IG / WhatsApp appear there).
 * Then opens the chosen app when possible.
 */
export async function shareMediaToPlatform(
  options: ShareMediaOptions,
): Promise<"shared" | "opened-app" | "saved-guide"> {
  const imageIndex = options.imageIndex ?? 0;
  const isVideo =
    options.resultType === "video" || isVideoUrl(options.assetUrl);

  const blob = await fetchShareBlob(
    options.larpId,
    imageIndex,
    options.assetUrl,
  );
  const ext = inferDownloadExtension(blob, {
    resultType: isVideo ? "video" : "image",
    url: options.assetUrl ?? undefined,
  });
  const mime =
    blob.type ||
    (isVideo ? `video/${ext === "mov" ? "quicktime" : ext}` : "image/jpeg");
  const file = new File([blob], randomLarpDownloadName(ext), { type: mime });

  // 1) Native share sheet with file — best path on phones (lists Snapchat, IG, WA…)
  if (typeof navigator.share === "function" && navigator.canShare) {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "LuxeFlexIA",
        });
        return "shared";
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return "shared";
      }
    }
  }

  // 2) WhatsApp can still share a public URL
  if (options.platform === "whatsapp" && options.assetUrl) {
    openPlatformApp("whatsapp", options.assetUrl);
    return "opened-app";
  }

  // 3) Save locally then open the app so the user can pick from gallery
  try {
    await saveMediaBlob(blob, randomLarpDownloadName(ext), {
      resultType: isVideo ? "video" : "image",
      fallbackUrl: options.assetUrl ?? undefined,
    });
  } catch {
    /* still try to open the app */
  }

  openPlatformApp(options.platform, options.assetUrl);
  return "saved-guide";
}
