import { getSupportedVideoMimeType } from "@/lib/canvas-image";

export type CanvasFrameDrawer = (elapsedMs: number) => void;

interface RecordCanvasTimelineOptions {
  canvas: HTMLCanvasElement;
  fps: number;
  durationMs: number;
  drawFrame: CanvasFrameDrawer;
}

/**
 * Records a canvas animation into a video blob.
 *
 * The recording is decoupled from wall-clock time: each frame is rendered at a
 * fixed virtual timestamp (`frameIndex / fps`), so the output is always smooth
 * and plays at the exact intended speed regardless of how fast the machine can
 * draw or whether the tab is backgrounded.
 *
 * WebCodecs is used when available to produce a real MP4 frame-by-frame. When
 * it is not supported, we fall back to a real-time MediaRecorder capture (the
 * caller converts the resulting WebM to MP4 afterwards).
 */
export async function recordCanvasTimeline(
  options: RecordCanvasTimelineOptions,
): Promise<Blob> {
  const webCodecsBlob = await tryEncodeWithWebCodecs(options);
  if (webCodecsBlob) return webCodecsBlob;
  return recordWithMediaRecorder(options);
}

function frameCountFor(durationMs: number, fps: number): number {
  return Math.max(1, Math.round((durationMs / 1000) * fps));
}

async function pickAvcCodec(
  width: number,
  height: number,
  fps: number,
  bitrate: number,
): Promise<string | null> {
  if (typeof VideoEncoder === "undefined") return null;
  const candidates = ["avc1.640028", "avc1.4D0028", "avc1.42E01E"];
  for (const codec of candidates) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate,
        framerate: fps,
      });
      if (support.supported) return codec;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

async function tryEncodeWithWebCodecs({
  canvas,
  fps,
  durationMs,
  drawFrame,
}: RecordCanvasTimelineOptions): Promise<Blob | null> {
  if (
    typeof VideoEncoder === "undefined" ||
    typeof VideoFrame === "undefined"
  ) {
    return null;
  }

  const width = canvas.width;
  const height = canvas.height;
  const bitrate = 10_000_000;
  const codec = await pickAvcCodec(width, height, fps, bitrate);
  if (!codec) return null;

  try {
    const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: "avc", width, height, frameRate: fps },
      fastStart: "in-memory",
      firstTimestampBehavior: "offset",
    });

    let encoderError: unknown = null;
    const encoder = new VideoEncoder({
      output: (chunk, meta) => {
        try {
          muxer.addVideoChunk(chunk, meta);
        } catch (error) {
          encoderError = error;
        }
      },
      error: (error) => {
        encoderError = error;
      },
    });
    encoder.configure({ codec, width, height, bitrate, framerate: fps });

    const frameDurationUs = 1_000_000 / fps;
    const keyframeInterval = fps * 2;
    const totalFrames = frameCountFor(durationMs, fps);

    for (let index = 0; index < totalFrames; index += 1) {
      if (encoderError) throw encoderError;
      const elapsedMs = Math.min(durationMs, (index * 1000) / fps);
      drawFrame(elapsedMs);

      const frame = new VideoFrame(canvas, {
        timestamp: Math.round(index * frameDurationUs),
        duration: Math.round(frameDurationUs),
      });
      encoder.encode(frame, { keyFrame: index % keyframeInterval === 0 });
      frame.close();

      if (encoder.encodeQueueSize > 30) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    await encoder.flush();
    if (encoderError) throw encoderError;
    muxer.finalize();

    return new Blob([muxer.target.buffer], { type: "video/mp4" });
  } catch {
    // Any failure here falls back to the MediaRecorder path below.
    return null;
  }
}

function recordWithMediaRecorder({
  canvas,
  fps,
  durationMs,
  drawFrame,
}: RecordCanvasTimelineOptions): Promise<Blob> {
  const stream = canvas.captureStream(fps);
  const mimeType = getSupportedVideoMimeType();
  const recorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType } : undefined,
  );
  const chunks: BlobPart[] = [];

  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () =>
      reject(new Error("Erreur pendant l'enregistrement"));
    recorder.onstop = () =>
      resolve(new Blob(chunks, { type: mimeType || "video/webm" }));
  });

  recorder.start();
  const startedAt = performance.now();

  return new Promise<void>((resolve) => {
    const renderLoop = () => {
      const elapsedMs = performance.now() - startedAt;
      drawFrame(Math.min(durationMs, elapsedMs));
      if (elapsedMs >= durationMs) {
        resolve();
        return;
      }
      window.requestAnimationFrame(renderLoop);
    };
    window.requestAnimationFrame(renderLoop);
  }).then(async () => {
    recorder.stop();
    const blob = await stopped;
    stream.getTracks().forEach((track) => track.stop());
    return blob;
  });
}
