import { authFetch } from "@/lib/api";

export type VoiceDeliveryStyle = "casual" | "rap" | "hype" | "intimate" | "prank";

export type VoiceCloneResult = {
  clone: {
    id: string;
    name: string;
    fish_reference_id: string;
    fish_state: string;
    source_type: string;
    source_label: string | null;
    duration_sec: number | null;
    created_at: string;
  };
  fishReferenceId: string;
};

export type VoiceGenerateResult = {
  generation: {
    id: string;
    status: string;
    audio_url: string | null;
    text: string;
    credit_cost: number;
    created_at: string;
    completed_at: string | null;
  };
  audioUrl: string;
  creditCost: number;
};

export async function cloneVoice(params: {
  name: string;
  audioDataUrl: string;
  sourceType?: "record" | "import" | "catalog";
  sourceLabel?: string | null;
  durationSec?: number | null;
}): Promise<VoiceCloneResult> {
  const res = await authFetch("/api/larps/voice/clone", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      audioDataUrl: params.audioDataUrl,
      sourceType: params.sourceType ?? "import",
      sourceLabel: params.sourceLabel ?? null,
      durationSec: params.durationSec ?? null,
    }),
  });
  return res.json() as Promise<VoiceCloneResult>;
}

export type VoiceHistoryItem = {
  id: string;
  text: string;
  status: string;
  audioUrl: string | null;
  voiceName: string | null;
  creditCost: number;
  createdAt: string;
  completedAt: string | null;
};

export async function fetchVoiceHistory(limit = 40): Promise<VoiceHistoryItem[]> {
  const res = await authFetch(`/api/larps/voice/history?limit=${limit}`);
  const payload = (await res.json()) as { items?: VoiceHistoryItem[] };
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function deleteVoiceGenerations(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await authFetch("/api/larps/voice/delete", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

export async function generateVoice(params: {
  text: string;
  voiceCloneId?: string;
  fishReferenceId?: string;
  instantAudioDataUrl?: string;
  style?: VoiceDeliveryStyle;
  humanize?: boolean;
}): Promise<VoiceGenerateResult> {
  const res = await authFetch("/api/larps/voice/generate", {
    method: "POST",
    body: JSON.stringify({
      text: params.text,
      voiceCloneId: params.voiceCloneId,
      fishReferenceId: params.fishReferenceId,
      instantAudioDataUrl: params.instantAudioDataUrl,
      style: params.style ?? "casual",
      humanize: params.humanize === true,
    }),
  });
  return res.json() as Promise<VoiceGenerateResult>;
}
