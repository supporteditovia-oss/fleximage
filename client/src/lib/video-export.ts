import ffmpegCoreUrl from "@ffmpeg/core?url";
import ffmpegCoreWasmUrl from "@ffmpeg/core/wasm?url";

let ffmpegLoadPromise: Promise<any> | null = null;

function withExtension(filename: string, extension: "mp4" | "webm") {
  return filename.replace(/\.(webm|mp4)$/i, "") + `.${extension}`;
}

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

export async function convertWebmToMp4(webmBlob: Blob) {
  const [{ fetchFile }, ffmpeg] = await Promise.all([
    import("@ffmpeg/util"),
    getFFmpeg(),
  ]);
  const inputName = `input-${crypto.randomUUID()}.webm`;
  const outputName = `output-${crypto.randomUUID()}.mp4`;

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(webmBlob));
    const exitCode = await ffmpeg.exec([
      "-i",
      inputName,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "faststart",
      outputName,
    ]);

    if (exitCode !== 0) {
      throw new Error("Conversion MP4 impossible");
    }

    const data = await ffmpeg.readFile(outputName);
    const bytes =
      typeof data === "string" ? new TextEncoder().encode(data) : data;
    return new Blob([bytes], { type: "video/mp4" });
  } finally {
    await Promise.allSettled([
      ffmpeg.deleteFile(inputName),
      ffmpeg.deleteFile(outputName),
    ]);
  }
}

export async function downloadVideoAsMp4(blob: Blob, filename: string) {
  const isMp4 = blob.type.includes("mp4");
  const downloadBlob = isMp4 ? blob : await convertWebmToMp4(blob);
  const url = URL.createObjectURL(downloadBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = withExtension(filename, "mp4");
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
