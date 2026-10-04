import ffmpegCoreUrl from "@ffmpeg/core?url";
import ffmpegCoreWasmUrl from "@ffmpeg/core/wasm?url";
import { withNormalizedVideoFile } from "@/lib/media-file-detect";
import { VIDEO_INLINE_FALLBACK_MAX_BYTES } from "@/lib/upload-video";

const STUDIO_MAX_DURATION_SEC = 8;

let ffmpegLoadPromise: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;

async function getFFmpeg() {
  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: ffmpegCoreUrl,
        wasmURL: ffmpegCoreWasmUrl,
      });
      return ffmpeg;
    })();
  }
  return ffmpegLoadPromise;
}

function fileExt(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith(".mov")) return ".mov";
  if (name.endsWith(".webm")) return ".webm";
  return ".mp4";
}

/**
 * Réduit une vidéo studio (720p max, 8 s) pour passer l'upload API / Vercel si le PUT R2 échoue.
 */
export async function compressVideoForStudioUpload(file: File): Promise<File> {
  const normalized = withNormalizedVideoFile(file);
  if (normalized.size <= VIDEO_INLINE_FALLBACK_MAX_BYTES) {
    return normalized;
  }

  const [{ fetchFile }, ffmpeg] = await Promise.all([
    import("@ffmpeg/util"),
    getFFmpeg(),
  ]);

  const inputName = `v2v-in-${crypto.randomUUID()}${fileExt(normalized)}`;
  const outputName = `v2v-out-${crypto.randomUUID()}.mp4`;

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(normalized));
    const exit = await ffmpeg.exec([
      "-i",
      inputName,
      "-t",
      String(STUDIO_MAX_DURATION_SEC),
      "-vf",
      "scale='min(720,iw)':-2:flags=lanczos,setsar=1",
      "-r",
      "30",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "32",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      "-ar",
      "44100",
      outputName,
    ]);

    if (exit !== 0) {
      return normalized;
    }

    const data = await ffmpeg.readFile(outputName);
    const bytes =
      typeof data === "string" ? new TextEncoder().encode(data) : data;
    const blob = new Blob([bytes], { type: "video/mp4" });
    const baseName = normalized.name.replace(/\.[^.]+$/, "") || "clip";
    return new File([blob], `${baseName}-studio.mp4`, {
      type: "video/mp4",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("[compress-video-studio] fallback to original", err);
    return normalized;
  } finally {
    await Promise.allSettled([
      ffmpeg.deleteFile(inputName),
      ffmpeg.deleteFile(outputName),
    ]);
  }
}
