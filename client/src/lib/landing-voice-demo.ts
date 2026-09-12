/** Démo voix landing — Maître Gims (même modèle Fish que le catalogue). */
export const LANDING_VOICE_DEMO_SCRIPT =
  "Salut, je me présente, c'est Maître Gims — j'ai été généré par LuxeFlexIA.";

/** Fichier statique généré au build Vercel (script/generate-landing-gims-demo.mjs). */
export const LANDING_VOICE_DEMO_SRC = "/assets/landing-v2/gims-voice-demo.mp3";

/** Secours : synthèse Fish + cache R2 côté API. */
export const LANDING_VOICE_DEMO_API = "/api/larps/voice/landing-demo";

export const LANDING_VOICE_DEMO_PHOTO = "/assets/voice-catalog/gims.jpg";
export const LANDING_VOICE_DEMO_NAME = "Maître Gims";

export function splitSubtitleWords(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/** Nombre de mots « prononcés » selon la progression audio. */
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
