import { authFetch } from "@/lib/api";

export type I2VLibraryVoice = {
  id: string;
  name: string;
  gender: "homme" | "femme";
  ageBand: string;
  styleFr: string;
  previewPath: string | null;
  commercialUseOk: boolean;
};

export type I2VCloneVoice = {
  id: string;
  i2vVoiceId: string;
  name: string;
  kind: "clone";
  gender: null;
  styleFr: string;
  previewPath: null;
  durationSec: number | null;
  createdAt: string;
};

export type I2VVoicesPayload = {
  library: I2VLibraryVoice[];
  clones: I2VCloneVoice[];
  defaultVoiceId: string | null;
  previewPhrase: string;
};

export async function fetchI2VVoices(): Promise<I2VVoicesPayload | null> {
  const res = await authFetch("/api/larps/i2v-voices");
  if (!res.ok) return null;
  return (await res.json()) as I2VVoicesPayload;
}

export async function fetchI2VVoicePreviewUrl(voiceId: string): Promise<string | null> {
  const q = encodeURIComponent(voiceId);
  const res = await authFetch(`/api/larps/i2v-voice/preview?id=${q}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { audioUrl?: string };
  return data.audioUrl ?? null;
}
