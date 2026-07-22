export type GenerationMediaKind = "image" | "video";

export function inferDownloadMediaMeta(
  assetUrl: string,
  contentTypeHeader: string | null | undefined,
  generationType?: GenerationMediaKind | null,
): { contentType: string; extension: string } {
  const header = (contentTypeHeader ?? "").split(";")[0].trim().toLowerCase();
  const urlLower = assetUrl.toLowerCase();

  if (header.startsWith("video/")) {
    return {
      contentType: header,
      extension: extensionFromVideoMime(header),
    };
  }

  if (header.startsWith("image/")) {
    return {
      contentType: header,
      extension: extensionFromImageMime(header),
    };
  }

  const urlExt = urlLower.match(/\.(mp4|webm|mov|m4v|png|webp|jpe?g)(\?|#|$)/i)?.[1];
  if (urlExt) {
    const ext = urlExt.toLowerCase();
    if (ext === "mp4" || ext === "webm" || ext === "mov" || ext === "m4v") {
      const normalized = ext === "m4v" ? "mp4" : ext;
      return {
        contentType:
          ext === "webm"
            ? "video/webm"
            : ext === "mov"
              ? "video/quicktime"
              : "video/mp4",
        extension: normalized,
      };
    }
    if (ext === "png" || ext === "webp" || ext === "jpg" || ext === "jpeg") {
      const normalized = ext === "jpeg" ? "jpg" : ext;
      return {
        contentType: `image/${normalized === "jpg" ? "jpeg" : normalized}`,
        extension: normalized,
      };
    }
  }

  if (generationType === "video") {
    return { contentType: "video/mp4", extension: "mp4" };
  }

  return { contentType: "image/png", extension: "png" };
}

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
