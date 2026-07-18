/**
 * Extract a JPEG still from a video file (first readable frame).
 * Used so video-mode uploads can still feed image-to-video providers.
 */
export async function extractVideoFrameAsJpegFile(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Failed to load video"));
    });

    if (video.readyState < 2) {
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error("Failed to load video frame"));
      });
    }

    const seekTo = Number.isFinite(video.duration) && video.duration > 0
      ? Math.min(0.1, video.duration / 2)
      : 0;

    if (seekTo > 0) {
      video.currentTime = seekTo;
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error("Failed to seek video"));
      });
    }

    const width = video.videoWidth || 720;
    const height = video.videoHeight || 1280;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas unavailable");
    }
    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("Failed to encode video frame"));
        },
        "image/jpeg",
        0.92,
      );
    });

    const baseName = file.name.replace(/\.[^.]+$/, "") || "video-frame";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function toGenerationImageFile(file: File): Promise<File> {
  if (file.type.startsWith("video/")) {
    return extractVideoFrameAsJpegFile(file);
  }
  return file;
}
