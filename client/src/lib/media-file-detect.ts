/** Fichiers vidéo sans MIME (SnapTik, TikTok, certains navigateurs). */
const VIDEO_EXT = /\.(mp4|mov|webm|mkv|m4v|avi|3gp)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i;

export function isVideoMediaFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("video/")) return true;
  if (type === "application/octet-stream" && VIDEO_EXT.test(file.name)) return true;
  return VIDEO_EXT.test(file.name);
}

export function isImageMediaFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/")) return true;
  if (type === "application/octet-stream" && IMAGE_EXT.test(file.name)) return true;
  return IMAGE_EXT.test(file.name);
}

export function resolveVideoMimeType(file: File): string {
  const type = (file.type || "").trim().toLowerCase();
  if (type.startsWith("video/")) return type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".mov") || name.endsWith(".qt")) return "video/quicktime";
  if (name.endsWith(".webm")) return "video/webm";
  if (name.endsWith(".mkv")) return "video/x-matroska";
  if (name.endsWith(".m4v")) return "video/x-m4v";
  return "video/mp4";
}

export function withNormalizedVideoFile(file: File): File {
  if (!isVideoMediaFile(file)) return file;
  const mime = resolveVideoMimeType(file);
  if (file.type === mime) return file;
  return new File([file], file.name || "video.mp4", {
    type: mime,
    lastModified: file.lastModified,
  });
}

export async function fileToVideoDataUrl(file: File): Promise<string> {
  const normalized = withNormalizedVideoFile(file);
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(normalized);
  });
  const mime = resolveVideoMimeType(normalized);
  if (raw.startsWith(`data:${mime};`)) return raw;
  const base64 = raw.replace(/^data:[^;]*;base64,/, "");
  return `data:${mime};base64,${base64}`;
}
