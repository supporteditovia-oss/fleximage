import { api } from "@shared/routes";
import { authFetch } from "@/lib/api";

export type VoiceGeneration = {
  id: string;
  voice_name: string | null;
  text: string;
  audio_url: string;
  created_at?: string;
};

export async function cloneVoice(input: {
  name: string;
  audioDataUrl: string;
  sourceType?: "record" | "import";
  sourceLabel?: string | null;
  durationSec?: number | null;
}): Promise<{ clone: { id: string; name: string }; fishReferenceId: string }> {
  const res = await authFetch(api.larps.voice.clone.path, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function generateVoice(input: {
  text: string;
  voiceCloneId?: string | null;
  fishReferenceId?: string | null;
  instantAudioDataUrl?: string | null;
  voiceName?: string | null;
}): Promise<{ audioUrl: string; generation: VoiceGeneration }> {
  const res = await authFetch(api.larps.voice.generate.path, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function fetchVoiceHistory(
  limit = 30,
): Promise<{ items: VoiceGeneration[] }> {
  const res = await authFetch(
    `${api.larps.voice.history.path}?limit=${encodeURIComponent(limit)}`,
  );
  return res.json();
}

export async function deleteVoiceGenerations(
  ids: string[],
): Promise<{ deleted: number }> {
  const res = await authFetch(api.larps.voice.delete.path, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
  return res.json();
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
