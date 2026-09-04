export const MAX_CLIP_SEC = 25;
/** Durée cible pour un clone très fidèle (Fish Audio). */
export const IDEAL_CLIP_SEC = 20;
/** Minimum technique pour lancer un clone. */
export const MIN_CLIP_SEC = 2;

export type VoiceClipSource = "record" | "import";

export type VoiceClip = {
  blob: Blob;
  url: string;
  durationSec: number;
  source: VoiceClipSource;
  fileName?: string;
};

const VIDEO_EXT = /\.(mp4|mov|webm|mkv|m4v)$/i;

function isMobileCaptureUa(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

export function isVideoMediaFile(file: File): boolean {
  return file.type.startsWith("video/") || VIDEO_EXT.test(file.name);
}

export function revokeVoiceClipUrl(clip: VoiceClip | null) {
  if (clip?.url) {
    try {
      URL.revokeObjectURL(clip.url);
    } catch {
      /* ignore */
    }
  }
}

export function formatClipTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const total = Math.floor(sec);
  if (total >= 60) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  const ms = Math.floor((sec - total) * 10);
  return `${total}.${ms}s`;
}

function mountHiddenMediaElement(tag: "audio" | "video"): HTMLMediaElement {
  const el = document.createElement(tag);
  el.preload = "auto";
  el.muted = true;
  el.playsInline = true;
  el.setAttribute("playsinline", "");
  el.style.cssText =
    "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
  document.body.appendChild(el);
  return el;
}

function unmountMediaElement(el: HTMLMediaElement) {
  el.pause();
  el.removeAttribute("src");
  el.load();
  el.remove();
}

function normalizeDuration(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0 || raw === Infinity) return 0;
  return raw;
}

/** Audio pur (WAV, MP3…) via decodeAudioData. */
async function decodeAudioOnlyFile(file: File): Promise<AudioBuffer> {
  const ctx = new AudioContext();
  try {
    const arrayBuffer = await file.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await ctx.close();
  }
}

function waitMediaEvent(
  el: HTMLMediaElement,
  event: keyof HTMLMediaElementEventMap,
  timeoutMs = 3000,
): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      el.removeEventListener(event, finish);
      resolve();
    };
    el.addEventListener(event, finish);
    window.setTimeout(finish, timeoutMs);
  });
}

/** Extrait audio MP4/MOV via MediaRecorder (fallback fiable). */
async function decodeVideoSliceViaMediaRecorder(
  file: File,
  startSec: number,
  durationSec: number,
): Promise<Blob> {
  const url = URL.createObjectURL(file);
  const video = mountHiddenMediaElement("video") as HTMLVideoElement;
  video.src = url;
  video.volume = 1;

  try {
    await waitMediaEvent(video, "loadedmetadata", 12000);
    const maxDur = Math.max(0, video.duration - startSec);
    const sliceDur = Math.min(durationSec, maxDur);
    if (sliceDur <= 0) throw new Error("Fenêtre invalide");

    video.currentTime = Math.max(0, startSec);
    await waitMediaEvent(video, "seeked", 2500);

    const capture = video.captureStream?.bind(video) ??
      (video as HTMLVideoElement & { mozCaptureStream?: () => MediaStream })
        .mozCaptureStream?.bind(video);
    if (!capture) throw new Error("captureStream indisponible");

    const stream = capture.call(video);
    if (stream.getAudioTracks().length === 0) {
      throw new Error("Aucune piste audio");
    }

    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

    const recorder = mime
      ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 320000 })
      : new MediaRecorder(stream);

    const chunks: Blob[] = [];
    const recordMs = Math.ceil(sliceDur * 1000) + 180;

    return await new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onerror = () => reject(new Error("Enregistrement échoué"));
      recorder.onstop = () => {
        if (chunks.length === 0) {
          reject(new Error("Extrait vide"));
          return;
        }
        resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
      };

      recorder.start(100);
      void video.play().catch(() => undefined);
      window.setTimeout(() => {
        try {
          if (recorder.state === "recording") recorder.stop();
        } catch {
          reject(new Error("Stop enregistrement"));
        }
        video.pause();
      }, recordMs);
    });
  } finally {
    unmountMediaElement(video);
    URL.revokeObjectURL(url);
  }
}

/** Extrait audio d'une vidéo MP4/MOV — seulement la fenêtre demandée (pas tout le fichier). */
async function decodeVideoSliceToAudioBuffer(
  file: File,
  startSec: number,
  durationSec: number,
): Promise<AudioBuffer> {
  const url = URL.createObjectURL(file);
  const video = mountHiddenMediaElement("video") as HTMLVideoElement;
  video.src = url;

  try {
    await waitMediaEvent(video, "loadedmetadata", 12000);
    await waitMediaEvent(video, "canplay", 8000);

    const maxDur = Math.max(0, video.duration - startSec);
    const sliceDur = Math.min(durationSec, maxDur);
    if (sliceDur <= 0) throw new Error("Fenêtre invalide");

    const sampleRate = 48000;
    const length = Math.max(1, Math.ceil(sliceDur * sampleRate));
    const offline = new OfflineAudioContext(2, length, sampleRate);
    const source = offline.createMediaElementSource(video);
    source.connect(offline.destination);

    video.currentTime = Math.max(0, startSec);
    await waitMediaEvent(video, "seeked", 2500);

    await video.play().catch(() => undefined);
    await waitMediaEvent(video, "playing", 1500);

    const buffer = await offline.startRendering();
    video.pause();

    if (buffer.length < sampleRate * 0.25) {
      throw new Error("Buffer audio vide");
    }
    return buffer;
  } finally {
    unmountMediaElement(video);
    URL.revokeObjectURL(url);
  }
}

/** @deprecated Préférer buildVoiceClipFromFile pour les vidéos longues. */
async function decodeVideoToAudioBuffer(file: File): Promise<AudioBuffer> {
  const quick = await getMediaDurationQuick(file).catch(() => 0);
  const dur = quick > 0 ? quick : MAX_CLIP_SEC;
  return decodeVideoSliceToAudioBuffer(file, 0, Math.min(dur, MAX_CLIP_SEC));
}

/** Audio ou vidéo → AudioBuffer complet (éviter sur MP4 long). */
export async function decodeMediaFile(file: File): Promise<AudioBuffer> {
  if (isVideoMediaFile(file)) {
    const quick = await getMediaDurationQuick(file).catch(() => 0);
    if (quick > MAX_CLIP_SEC) {
      return decodeVideoSliceToAudioBuffer(
        file,
        0,
        Math.min(MAX_CLIP_SEC, quick),
      );
    }
    return decodeVideoToAudioBuffer(file);
  }
  try {
    return await decodeAudioOnlyFile(file);
  } catch {
    return decodeVideoSliceToAudioBuffer(file, 0, MAX_CLIP_SEC);
  }
}

/** @deprecated use decodeMediaFile */
export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  return decodeMediaFile(file);
}

function normalizeMeasuredDuration(raw: number, fallbackSec: number): number {
  if (Number.isFinite(raw) && raw >= MIN_CLIP_SEC - 0.05) {
    return raw;
  }
  if (Number.isFinite(fallbackSec) && fallbackSec >= MIN_CLIP_SEC - 0.05) {
    return Math.min(MAX_CLIP_SEC, fallbackSec);
  }
  return 0;
}

export async function getAudioDurationSec(blob: Blob): Promise<number> {
  const url = URL.createObjectURL(blob);
  try {
    const fromMetadata = await new Promise<number>((resolve) => {
      const audio = new Audio();
      audio.preload = "metadata";
      const finish = (value: number) => {
        audio.removeEventListener("loadedmetadata", onMeta);
        audio.removeEventListener("durationchange", onMeta);
        audio.removeEventListener("error", onErr);
        resolve(value);
      };
      const onMeta = () => {
        finish(Number.isFinite(audio.duration) ? audio.duration : 0);
      };
      const onErr = () => finish(0);
      audio.addEventListener("loadedmetadata", onMeta);
      audio.addEventListener("durationchange", onMeta);
      audio.addEventListener("error", onErr);
      audio.src = url;
      window.setTimeout(() => {
        finish(Number.isFinite(audio.duration) ? audio.duration : 0);
      }, 3000);
    });

    if (fromMetadata > 0) return fromMetadata;

    const ctx = new AudioContext();
    try {
      const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      return buffer.duration;
    } catch {
      return 0;
    } finally {
      await ctx.close();
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function sliceAudioBufferToBlob(
  buffer: AudioBuffer,
  startSec: number,
  durationSec: number,
): Promise<Blob> {
  const start = Math.max(0, Math.min(startSec, buffer.duration));
  const dur = Math.min(durationSec, buffer.duration - start);
  const startSample = Math.floor(start * buffer.sampleRate);
  const length = Math.max(1, Math.floor(dur * buffer.sampleRate));

  const offline = new OfflineAudioContext(
    buffer.numberOfChannels,
    length,
    buffer.sampleRate,
  );
  const source = offline.createBufferSource();
  const slice = offline.createBuffer(
    buffer.numberOfChannels,
    length,
    buffer.sampleRate,
  );

  for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
    const channel = buffer.getChannelData(ch);
    slice.copyToChannel(channel.subarray(startSample, startSample + length), ch);
  }

  source.buffer = slice;
  source.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();
  return audioBufferToWavBlob(rendered);
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const mono = new Float32Array(buffer.length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
    const channel = buffer.getChannelData(ch);
    const weight = 1 / buffer.numberOfChannels;
    for (let i = 0; i < buffer.length; i += 1) {
      mono[i] += channel[i] * weight;
    }
  }
  const dataLength = mono.length * blockAlign;
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < mono.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, mono[i]));
    const intSample = Math.round(sample < 0 ? sample * 0x8000 : sample * 0x7fff);
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

/** WAV 44.1 kHz mono 16-bit — format optimal pour Fish Audio. */
export async function prepareVoiceClipForClone(clip: VoiceClip): Promise<Blob> {
  const maxBytes = 3_800_000;
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await clip.blob.arrayBuffer());
    const targetRate = 44100;
    const length = Math.max(1, Math.ceil(decoded.duration * targetRate));
    const offline = new OfflineAudioContext(1, length, targetRate);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start(0);
    const rendered = await offline.startRendering();
    let wav = await audioBufferToWavBlob(rendered);
    if (wav.size <= maxBytes) return wav;

    const compact = new OfflineAudioContext(1, decoded.length, 22050);
    const compactSrc = compact.createBufferSource();
    compactSrc.buffer = decoded;
    compactSrc.connect(compact.destination);
    compactSrc.start(0);
    const compactRendered = await compact.startRendering();
    wav = await audioBufferToWavBlob(compactRendered);
    return wav;
  } catch {
    return clip.blob;
  } finally {
    await ctx.close();
  }
}

/** Réduit l’extrait avant envoi API (limite body Vercel ~4,5 Mo en base64). */
export async function compactVoiceClipForUpload(clip: VoiceClip): Promise<Blob> {
  const maxBytes = 2_200_000;
  if (clip.blob.size <= maxBytes) return clip.blob;

  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await clip.blob.arrayBuffer());
    const targetRate = 22_050;
    const length = Math.max(1, Math.ceil(decoded.duration * targetRate));
    const offline = new OfflineAudioContext(1, length, targetRate);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start(0);
    const rendered = await offline.startRendering();
    return audioBufferToWavBlob(rendered);
  } catch {
    return clip.blob;
  } finally {
    await ctx.close();
  }
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i += 1) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export async function buildVoiceClipFromBuffer(
  buffer: AudioBuffer,
  startSec: number,
  durationSec: number,
  source: VoiceClipSource,
  fileName?: string,
): Promise<VoiceClip> {
  const windowSec = Math.min(
    MAX_CLIP_SEC,
    Math.max(MIN_CLIP_SEC, durationSec),
    buffer.duration - startSec,
  );
  const blob = await sliceAudioBufferToBlob(buffer, startSec, windowSec);
  const url = URL.createObjectURL(blob);
  const measuredSec = await getAudioDurationSec(blob);
  return {
    blob,
    url,
    durationSec: measuredSec,
    source,
    fileName,
  };
}

/** Découpe audio ou MP4/MOV — n’extrait que la fenêtre [start, end]. */
export async function buildVoiceClipFromFile(
  file: File,
  startSec: number,
  endSec: number,
  source: VoiceClipSource,
  fileName?: string,
  cachedAudioBuffer?: AudioBuffer | null,
): Promise<VoiceClip> {
  const durationSec = endSec - startSec;

  if (isVideoMediaFile(file)) {
    const sliceDur = Math.max(
      MIN_CLIP_SEC,
      Math.min(MAX_CLIP_SEC, endSec - startSec),
    );
    const buildFromBlob = async (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const measuredSec = await getAudioDurationSec(blob);
      const durationSec = normalizeMeasuredDuration(measuredSec, sliceDur);
      if (durationSec <= 0) {
        URL.revokeObjectURL(url);
        throw new Error("Extrait audio vide");
      }
      return {
        blob,
        url,
        durationSec,
        source,
        fileName: fileName ?? file.name,
      };
    };

    const attempts: Array<() => Promise<VoiceClip>> = [];

    if (!isMobileCaptureUa()) {
      attempts.push(async () => {
        const { extractAudioSliceFfmpeg } = await import("@/lib/voice-audio-slice");
        const blob = await extractAudioSliceFfmpeg(file, startSec, sliceDur);
        return buildFromBlob(blob);
      });
    }

    attempts.push(async () => {
      const sliced = await decodeVideoSliceToAudioBuffer(file, startSec, sliceDur);
      const blob = await audioBufferToWavBlob(sliced);
      return buildFromBlob(blob);
    });

    attempts.push(async () => {
      const blob = await decodeVideoSliceViaMediaRecorder(file, startSec, sliceDur);
      return buildFromBlob(blob);
    });

    if (isMobileCaptureUa()) {
      attempts.push(async () => {
        const { extractAudioSliceFfmpeg } = await import("@/lib/voice-audio-slice");
        const blob = await extractAudioSliceFfmpeg(file, startSec, sliceDur);
        return buildFromBlob(blob);
      });
    }

    let lastError: unknown;
    for (const attempt of attempts) {
      try {
        return await attempt();
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Impossible d’extraire l’audio de la vidéo");
  }

  const buffer = cachedAudioBuffer ?? (await decodeAudioOnlyFile(file));
  return buildVoiceClipFromBuffer(
    buffer,
    startSec,
    durationSec,
    source,
    fileName ?? file.name,
  );
}

/** Extrait jusqu'à 25 s même si la durée vidéo est inconnue (mobile). */
export async function buildDefaultVideoImportClip(
  file: File,
  fileName?: string,
): Promise<VoiceClip> {
  return buildVoiceClipFromFile(
    file,
    0,
    MAX_CLIP_SEC,
    "import",
    fileName ?? file.name,
  );
}

export async function buildVoiceClipFromBlob(
  blob: Blob,
  source: VoiceClipSource,
  fileName?: string,
): Promise<VoiceClip> {
  const url = URL.createObjectURL(blob);
  const durationSec = await getAudioDurationSec(blob);
  return { blob, url, durationSec, source, fileName };
}

export function clampTrimStart(totalSec: number, startSec: number): number {
  if (totalSec <= MAX_CLIP_SEC) return 0;
  const maxStart = totalSec - MAX_CLIP_SEC;
  return Math.max(0, Math.min(startSec, maxStart));
}

export function needsTrimWindow(totalSec: number): boolean {
  return totalSec > MAX_CLIP_SEC + 0.05;
}

/** Sélection par défaut : utilise le max utile (~25 s) pour un clone fidèle. */
export function defaultTrimRange(totalSec: number): { start: number; end: number } {
  const total = Math.max(0, totalSec);
  if (total <= 0) return { start: 0, end: 0 };
  if (total <= MAX_CLIP_SEC) {
    return { start: 0, end: total };
  }
  return { start: 0, end: MAX_CLIP_SEC };
}

/** Glisser le bloc sans changer sa durée. */
export function clampTrimMove(
  totalSec: number,
  startSec: number,
  endSec: number,
  newStartSec: number,
): { start: number; end: number } {
  const total = Math.max(0, totalSec);
  const dur = Math.max(MIN_CLIP_SEC, Math.min(MAX_CLIP_SEC, endSec - startSec));
  const maxStart = Math.max(0, total - dur);
  const start = Math.max(0, Math.min(newStartSec, maxStart));
  return { start, end: start + dur };
}

/** Poignée gauche — max 25 s, min 2 s. */
export function clampTrimResizeLeft(
  totalSec: number,
  _startSec: number,
  endSec: number,
  newStartSec: number,
): { start: number; end: number } {
  const total = Math.max(0, totalSec);
  const end = Math.min(total, endSec);
  const maxStart = Math.max(0, end - MAX_CLIP_SEC);
  const minStart = Math.max(0, end - MIN_CLIP_SEC);
  const start = Math.max(maxStart, Math.min(newStartSec, minStart));
  return { start, end };
}

/** Poignée droite — max 25 s, min 2 s. */
export function clampTrimResizeRight(
  totalSec: number,
  startSec: number,
  _endSec: number,
  newEndSec: number,
): { start: number; end: number } {
  const total = Math.max(0, totalSec);
  const start = Math.max(0, startSec);
  const minEnd = Math.min(total, start + MIN_CLIP_SEC);
  const maxEnd = Math.min(total, start + MAX_CLIP_SEC);
  const end = Math.max(minEnd, Math.min(newEndSec, maxEnd));
  return { start, end };
}

async function probeMediaDuration(url: string, tag: "audio" | "video"): Promise<number> {
  const el = mountHiddenMediaElement(tag);
  el.src = url;
  if (tag === "video") {
    (el as HTMLVideoElement).preload = "auto";
  }

  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const read = () => {
        const d = normalizeDuration(el.duration);
        if (d > 0) resolve(d);
      };

      el.onloadedmetadata = read;
      el.ondurationchange = read;
      el.onloadeddata = read;
      el.onerror = () => reject(new Error("metadata"));

      window.setTimeout(() => {
        const d = normalizeDuration(el.duration);
        if (d > 0) resolve(d);
        else reject(new Error("timeout"));
      }, tag === "video" ? 20000 : 10000);
    });

    if (tag !== "video" || duration > 0) {
      return duration;
    }

    return await probeVideoDurationWithSeek(el as HTMLVideoElement);
  } finally {
    unmountMediaElement(el);
  }
}

/** MP4/MOV : certaines métadonnées ne donnent la vraie durée qu’après un seek. */
async function probeVideoDurationWithSeek(video: HTMLVideoElement): Promise<number> {
  let best = normalizeDuration(video.duration);
  if (best > 0) return best;

  await new Promise<void>((resolve) => {
    const finish = () => {
      video.removeEventListener("seeked", finish);
      resolve();
    };
    video.addEventListener("seeked", finish);
    try {
      video.currentTime = 1e10;
    } catch {
      resolve();
      return;
    }
    window.setTimeout(finish, 4000);
  });

  best = normalizeDuration(video.duration);
  if (best > 0) {
    try {
      video.currentTime = 0;
    } catch {
      /* ignore */
    }
    return best;
  }

  return 0;
}

/** Durée via métadonnées — instantané, avant décodage complet. */
export async function getMediaDurationQuick(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  const tags: Array<"audio" | "video"> = isVideoMediaFile(file)
    ? ["video", "audio"]
    : ["audio", "video"];

  try {
    for (const tag of tags) {
      try {
        const d = await probeMediaDuration(url, tag);
        if (d > 0) return d;
      } catch {
        /* essayer l’autre balise */
      }
    }
    return 0;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Relecture durée depuis une URL blob déjà créée (preview import). */
export async function getMediaDurationFromUrl(
  url: string,
  preferVideo: boolean,
): Promise<number> {
  const tags: Array<"audio" | "video"> = preferVideo
    ? ["video", "audio"]
    : ["audio", "video"];

  for (const tag of tags) {
    try {
      const d = await probeMediaDuration(url, tag);
      if (d > 0) return d;
    } catch {
      /* essayer l’autre balise */
    }
  }
  return 0;
}

export function clampTrimRange(
  totalSec: number,
  startSec: number,
  endSec: number,
): { start: number; end: number } {
  const total = Math.max(0, totalSec);
  let start = Math.max(0, startSec);
  let end = Math.min(total, endSec);
  let dur = end - start;

  if (dur > MAX_CLIP_SEC) {
    end = start + MAX_CLIP_SEC;
    dur = MAX_CLIP_SEC;
  }
  if (dur < MIN_CLIP_SEC) {
    end = Math.min(total, start + MIN_CLIP_SEC);
    dur = end - start;
  }
  if (end > total) {
    end = total;
    start = Math.max(0, end - dur);
  }
  if (start < 0) start = 0;

  return { start, end };
}
