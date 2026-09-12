import catalog from "@shared/voice-catalog.json";

export type LandingVoiceGender = "homme" | "femme";

export type LandingVoiceEntry = {
  slug: string;
  name: string;
  gender: LandingVoiceGender;
  category: string;
  description: string;
  fishId: string;
  photo?: string;
  pitch: number;
  rate: number;
  demoKind: "artist" | "natural-male" | "natural-female";
  initials?: string;
  accent?: string;
};

export const LANDING_VOICE_CATALOG = catalog.entries as LandingVoiceEntry[];

export const LANDING_VOICE_DEFAULT_SLUG = "gims";

export function buildLandingVoiceScript(entry: Pick<LandingVoiceEntry, "name" | "demoKind">): string {
  if (entry.demoKind === "natural-male") {
    return "Bonjour, voici une voix masculine naturelle — générée par LuxeFlexIA.";
  }
  if (entry.demoKind === "natural-female") {
    return "Bonjour, voici une voix féminine naturelle — générée par LuxeFlexIA.";
  }
  return `Salut, je me présente, c'est ${entry.name} — j'ai été généré par LuxeFlexIA.`;
}

export function landingVoicePhoto(entry: LandingVoiceEntry): string | null {
  if (!entry.photo) return null;
  return `/assets/voice-catalog/${entry.photo}`;
}

/** MP3 same-origin — évite les blocages cross-origin R2 sur mobile. */
export function landingVoiceDemoSrc(slug: string): string {
  return `/api/larps/voice/landing-demo?slug=${encodeURIComponent(slug)}&media=1`;
}

export function splitSubtitleWords(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

export function spokenWordCount(
  currentSec: number,
  durationSec: number,
  totalWords: number,
): number {
  if (totalWords <= 0) return 0;
  if (durationSec <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, currentSec / durationSec));
  return Math.min(totalWords, Math.max(0, Math.ceil(ratio * totalWords)));
}

export function formatVoiceClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
