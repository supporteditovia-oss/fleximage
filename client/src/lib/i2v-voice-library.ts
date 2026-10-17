import library from "@shared/i2v-voice-library.json";

export type I2VLibraryVoice = {
  id: string;
  name: string;
  gender: "homme" | "femme";
  styleFr: string;
  fishId: string;
  previewPath: string;
};

export function listActiveI2VLibraryVoices(): I2VLibraryVoice[] {
  return (library.entries ?? [])
    .filter((entry) => entry.active === true)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      gender: entry.gender as "homme" | "femme",
      styleFr: entry.styleFr,
      fishId: entry.fishId,
      previewPath: entry.previewPath,
    }));
}

export function resolveDefaultI2VLibraryVoiceId(): string {
  const active = listActiveI2VLibraryVoices();
  return (
    active.find((v) => v.id === "i2v-fr-homme-chaleureux")?.id ||
    active.find((v) => v.gender === "homme")?.id ||
    active[0]?.id ||
    ""
  );
}

export function findI2VLibraryVoiceById(id: string | null): I2VLibraryVoice | null {
  if (!id) return null;
  return listActiveI2VLibraryVoices().find((v) => v.id === id) ?? null;
}

/** Repli local si l’API Fish est lente ou indisponible. */
export function staticPreviewPathForFishId(fishId: string): string | null {
  const key = fishId.trim().toLowerCase();
  if (!key) return null;
  const entry = (library.entries ?? []).find(
    (e) => String(e.fishId || "").toLowerCase() === key,
  );
  return entry?.previewPath ?? null;
}
