import type { ClonedVoice } from "@/lib/v2-mock-voice";
import type { VoiceClip } from "@/lib/voice-capture";
import { prepareVoiceClipForClone } from "@/lib/voice-capture";

const STORAGE_KEY = "luxeflexia:cloned-voices";
const MAX_STORED = 12;

export type StoredClonedVoice = ClonedVoice & {
  clipDataUrl: string;
  durationSec: number;
  serverCloneId?: string;
  fishReferenceId?: string;
};

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function readClonedVoices(): StoredClonedVoice[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredClonedVoice[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v) =>
        v &&
        typeof v.id === "string" &&
        typeof v.name === "string" &&
        typeof v.clipDataUrl === "string",
    );
  } catch {
    return [];
  }
}

function writeClonedVoices(list: StoredClonedVoice[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota — ignore */
  }
}

export function getStoredClonedVoice(id: string): StoredClonedVoice | null {
  return readClonedVoices().find((v) => v.id === id) ?? null;
}

export async function persistClonedVoice(
  entry: ClonedVoice,
  clip: VoiceClip,
): Promise<StoredClonedVoice | null> {
  if (typeof window === "undefined") return null;
  try {
    const clipDataUrl = await blobToDataUrl(clip.blob);
    const stored: StoredClonedVoice = {
      ...entry,
      clipDataUrl,
      durationSec: clip.durationSec,
    };
    const next = [stored, ...readClonedVoices().filter((v) => v.id !== entry.id)].slice(
      0,
      MAX_STORED,
    );
    writeClonedVoices(next);
    return stored;
  } catch {
    return null;
  }
}

export function removeClonedVoice(id: string): void {
  writeClonedVoices(readClonedVoices().filter((v) => v.id !== id));
}

export function updateClonedVoiceServerIds(
  localId: string,
  ids: { serverCloneId: string; fishReferenceId: string },
): void {
  const next = readClonedVoices().map((voice) =>
    voice.id === localId
      ? { ...voice, serverCloneId: ids.serverCloneId, fishReferenceId: ids.fishReferenceId }
      : voice,
  );
  writeClonedVoices(next);
}

export async function voiceClipToDataUrl(clip: VoiceClip): Promise<string> {
  const prepared = await prepareVoiceClipForClone(clip);
  return blobToDataUrl(prepared);
}
