import ffmpegCoreUrl from "@ffmpeg/core?url";
import ffmpegCoreWasmUrl from "@ffmpeg/core/wasm?url";

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
  const m = file.name.match(/(\.[a-z0-9]+)$/i);
  return m?.[1]?.toLowerCase() ?? ".mp4";
}

/** Extrait une tranche audio lossless (WAV 48 kHz 24-bit) via FFmpeg. */
export async function extractAudioSliceFfmpeg(
  file: File,
  startSec: number,
  durationSec: number,
): Promise<Blob> {
  const [{ fetchFile }, ffmpeg] = await Promise.all([
    import("@ffmpeg/util"),
    getFFmpeg(),
  ]);

  const inputName = `voice-in-${crypto.randomUUID()}${fileExt(file)}`;
  const outputName = `voice-out-${crypto.randomUUID()}.wav`;

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    const exit = await ffmpeg.exec([
      "-ss",
      String(Math.max(0, startSec)),
      "-i",
      inputName,
      "-t",
      String(Math.max(0.1, durationSec)),
      "-vn",
      "-acodec",
      "pcm_s16le",
      "-ar",
      "44100",
      "-ac",
      "1",
      outputName,
    ]);

    if (exit !== 0) {
      throw new Error("Extraction FFmpeg échouée");
    }

    const data = await ffmpeg.readFile(outputName);
    const bytes =
      typeof data === "string" ? new TextEncoder().encode(data) : data;
    return new Blob([bytes], { type: "audio/wav" });
  } finally {
    await Promise.allSettled([
      ffmpeg.deleteFile(inputName),
      ffmpeg.deleteFile(outputName),
    ]);
  }
}
