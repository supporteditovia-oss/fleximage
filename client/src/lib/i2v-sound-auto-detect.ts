import { authFetch } from "@/lib/api";

export type I2VSoundAutoDetection = {
  ambiance: "none" | "street" | "crowd_protest";
  sfx: string | null;
  sfx_moment: "start" | "middle" | "end";
  confidence: number;
  label_fr: string;
  suggested_voice_filter?: "homme" | "femme" | "all";
  source?: string;
};

export async function fetchI2vSoundDetect(params: {
  motionPrompt: string;
  imageDescription?: string;
}): Promise<I2VSoundAutoDetection | null> {
  const motion_prompt = params.motionPrompt.trim();
  if (motion_prompt.length < 3) return null;

  const res = await authFetch("/api/larps/i2v-sound-detect", {
    method: "POST",
    body: JSON.stringify({
      motion_prompt,
      image_description: params.imageDescription?.trim() || "",
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { detection?: I2VSoundAutoDetection };
  return data.detection ?? null;
}
