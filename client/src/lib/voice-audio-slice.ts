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

/**
 * Nettoyage avant clonage : un extrait bruité (Discord, rue, musique de fond)
 * apprend le bruit au modèle en même temps que la voix, et le clone sonne faux.
 * Dosage volontairement léger — assez pour retirer le souffle, pas assez pour
 * toucher au timbre, qui est justement ce que le clone doit reproduire.
 */
const CLEANUP_FILTERS = [
  "highpass=f=70", // grondement, plosives, bruit de manipulation
  "afftdn=nr=10:nf=-28", // souffle de fond, léger pour ne pas rendre métallique
  "dynaudnorm=f=200:g=11", // égalise chuchotements et cris
  "alimiter=limit=0.97", // évite la saturation des passages criés
].join(",");

/** Extrait une tranche audio lossless (WAV 44,1 kHz mono) via FFmpeg. */
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
      "-af",
      CLEANUP_FILTERS,
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
