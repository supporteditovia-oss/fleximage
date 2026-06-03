export type GenerationMediaKind = "image" | "video";

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

  return "jpg";
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export function randomLarpDownloadName(extension: string) {
  const suffix = Math.random().toString(36).substring(2, 8);
  return `larp-${suffix}.${extension}`;
}
