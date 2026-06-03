const ILLUSTRATION_VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

/** True when the illustration URL points to a video (R2/CDN). */
export function isTemplateIllustrationVideo(url: string): boolean {
  try {
    const pathname = new URL(url, "https://local.invalid").pathname;
    return ILLUSTRATION_VIDEO_EXT.test(pathname);
  } catch {
    return ILLUSTRATION_VIDEO_EXT.test(url);
  }
}

export function isAfterIllustrationVideo(
  preview: string | null,
  file: File | null,
): boolean {
  if (file?.type.startsWith("video/")) return true;
  if (preview && !preview.startsWith("blob:")) {
    return isTemplateIllustrationVideo(preview);
  }
  return false;
}

export const AFTER_ILLUSTRATION_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

export const MAX_AFTER_VIDEO_BYTES = 80 * 1024 * 1024;
