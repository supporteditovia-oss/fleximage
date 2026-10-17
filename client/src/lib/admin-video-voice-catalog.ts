import {
  findI2VLibraryVoiceById,
  listActiveI2VLibraryVoices,
  resolveDefaultI2VLibraryVoiceId,
} from "@/lib/i2v-voice-library";
import { MOCK_VOICE_CATALOG, type MockVoiceProfile } from "@/lib/v2-mock-voice";

export type AdminVideoVoiceGroup = "i2v" | "rap" | "catalog";

export type AdminVideoVoice = {
  id: string;
  name: string;
  fishId: string;
  tag: string;
  gender: "homme" | "femme";
  group: AdminVideoVoiceGroup;
};

export type AdminVideoVoiceFilter = "femme" | "homme" | "rap";

function catalogToAdminVoice(voice: MockVoiceProfile): AdminVideoVoice | null {
  const fishId = String(voice.fishReferenceId || "").trim();
  if (!/^[a-f0-9]{32}$/i.test(fishId)) return null;
  const group: AdminVideoVoiceGroup =
    voice.category === "Rap" ? "rap" : "catalog";
  return {
    id: voice.id,
    name: voice.name,
    fishId: fishId.toLowerCase(),
    tag: voice.description,
    gender: voice.gender === "femme" ? "femme" : "homme",
    group,
  };
}

export function listAdminVideoVoices(): AdminVideoVoice[] {
  const i2v: AdminVideoVoice[] = listActiveI2VLibraryVoices().map((v) => ({
    id: v.id,
    name: v.name,
    fishId: v.fishId.toLowerCase(),
    tag: v.styleFr,
    gender: v.gender,
    group: "i2v" as const,
  }));
  const catalog = MOCK_VOICE_CATALOG.map(catalogToAdminVoice).filter(
    (v): v is AdminVideoVoice => v !== null,
  );
  return [...i2v, ...catalog];
}

export function filterAdminVideoVoices(
  voices: AdminVideoVoice[],
  filter: AdminVideoVoiceFilter,
): AdminVideoVoice[] {
  if (filter === "rap") {
    return voices.filter((v) => v.group === "rap");
  }
  if (filter === "femme") {
    return voices.filter((v) => v.gender === "femme");
  }
  return voices.filter(
    (v) => v.gender === "homme" && v.group !== "rap",
  );
}

export function resolveDefaultAdminVideoVoiceId(): string {
  return resolveDefaultI2VLibraryVoiceId() || listAdminVideoVoices()[0]?.id || "";
}

export function findAdminVideoVoiceById(id: string | null): AdminVideoVoice | null {
  if (!id) return null;
  if (id.startsWith("cat-")) {
    return catalogToAdminVoice(
      MOCK_VOICE_CATALOG.find((v) => v.id === id) as MockVoiceProfile,
    );
  }
  const i2v = findI2VLibraryVoiceById(id);
  if (i2v) {
    return {
      id: i2v.id,
      name: i2v.name,
      fishId: i2v.fishId.toLowerCase(),
      tag: i2v.styleFr,
      gender: i2v.gender,
      group: "i2v",
    };
  }
  return listAdminVideoVoices().find((v) => v.id === id) ?? null;
}

export function resolveAdminVideoVoiceFishId(id: string | null): string | undefined {
  return findAdminVideoVoiceById(id)?.fishId;
}

/** i2v_voice_id API — uniquement entrées bibliothèque I2V (pas les cat-* rappeurs). */
export function resolveI2VVoiceIdForApi(id: string | null): string | undefined {
  if (!id || id.startsWith("cat-")) return undefined;
  if (findI2VLibraryVoiceById(id)) return id;
  return undefined;
}
