const LAST_I2V_VOICE_ID_KEY = "luxeflexia.i2v.last_voice_id";
const I2V_VOICE_FILTER_KEY = "luxeflexia.i2v.voice_filter";

export type I2VVoiceGenderFilter = "all" | "homme" | "femme";

export function readLastI2VVoiceId(): string | null {
  try {
    const raw = localStorage.getItem(LAST_I2V_VOICE_ID_KEY);
    return raw && raw.trim().length > 0 ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function writeLastI2VVoiceId(voiceId: string) {
  try {
    localStorage.setItem(LAST_I2V_VOICE_ID_KEY, voiceId.trim());
  } catch {
    /* ignore */
  }
}

export function readI2VVoiceGenderFilter(): I2VVoiceGenderFilter {
  try {
    const raw = localStorage.getItem(I2V_VOICE_FILTER_KEY);
    if (raw === "homme" || raw === "femme" || raw === "all") return raw;
  } catch {
    /* ignore */
  }
  return "all";
}

export function writeI2VVoiceGenderFilter(filter: I2VVoiceGenderFilter) {
  try {
    localStorage.setItem(I2V_VOICE_FILTER_KEY, filter);
  } catch {
    /* ignore */
  }
}
