export type GenerationMediaKind = "image" | "video";
export type SaveMediaResult = "saved" | "shared" | "aborted";

function extensionFromVideoMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime") || mime.includes("mov")) return "mov";
  return "mp4";
}

function extensionFromImageMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

export function inferDownloadExtension(
  blob: Blob,
  options?: { resultType?: GenerationMediaKind; url?: string },
): string {
  const mime = blob.type.toLowerCase();

  if (mime.startsWith("video/")) {
    return extensionFromVideoMime(mime);
  }
  if (mime.startsWith("image/")) {
    return extensionFromImageMime(mime);
  }

  const urlLower = options?.url?.toLowerCase() ?? "";
  const urlExt = urlLower.match(/\.(mp4|webm|mov|m4v|png|webp|jpe?g)(\?|#|$)/i)?.[1];
  if (urlExt) {
    const ext = urlExt.toLowerCase();
    if (ext === "m4v") return "mp4";
    if (ext === "jpeg") return "jpg";
    return ext;
  }

  if (options?.resultType === "video") {
    return "mp4";
  }

  // Prefer lossless PNG when the server didn't advertise a type.
  return "png";
}

export function randomLarpDownloadName(extension: string) {
  const suffix = Math.random().toString(36).substring(2, 8);
  return `luxeflexia-${suffix}.${extension}`;
}

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  // iPadOS 13+ reports as MacIntel with touch
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function mimeForFilename(filename: string, blobType: string, kind?: GenerationMediaKind): string {
  if (blobType && blobType !== "application/octet-stream") return blobType;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webm") return "video/webm";
  if (ext === "mov") return "video/quicktime";
  if (ext === "mp4") return "video/mp4";
  return kind === "video" ? "video/mp4" : "image/png";
}

/** Reject HTML/JSON error bodies that somehow arrived as a "successful" blob. */
export function assertMediaBlob(blob: Blob): void {
  if (!blob || blob.size === 0) {
    throw new Error("empty_blob");
  }
  const typeHint = (blob.type || "").toLowerCase();
  if (typeHint.includes("application/json") || typeHint.includes("text/html")) {
    throw new Error("invalid_blob_type");
  }
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Delay revoke so Safari can start the download.
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 2_000);
}

/**
 * Save a media blob in a way that works on iPhone (Web Share → “Enregistrer l’image”)
 * and desktop (classic download attribute). Never recompresses the bytes.
 */
export async function saveMediaBlob(
  blob: Blob,
  filename: string,
  options?: { resultType?: GenerationMediaKind; fallbackUrl?: string },
): Promise<SaveMediaResult> {
  assertMediaBlob(blob);

  const mime = mimeForFilename(filename, blob.type, options?.resultType);
  const file = new File([blob], filename, { type: mime });
  const typedBlob = blob.type === mime ? blob : new Blob([blob], { type: mime });

  const canShareFiles =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function";

  // iOS: <a download> is unreliable — prefer the native share sheet.
  if (isIOSDevice() && canShareFiles) {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return "shared";
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "aborted";
      // Fall through to other strategies.
    }

    if (options?.fallbackUrl) {
      try {
        await navigator.share({
          url: options.fallbackUrl,
          title: filename,
        });
        return "shared";
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return "aborted";
      }
    }
  }

  triggerBlobDownload(typedBlob, filename);
  return "saved";
}
