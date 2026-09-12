/** Démo voix landing — catalogue rappeurs (même modèles Fish que le studio). */

export type LandingVoiceRapper = {
  slug: string;
  name: string;
  photo: string;
};

export const LANDING_VOICE_RAPPERS: LandingVoiceRapper[] = [
  { slug: "gims", name: "Maître Gims", photo: "/assets/voice-catalog/gims.jpg" },
  { slug: "maes", name: "Maes", photo: "/assets/voice-catalog/maes.jpg" },
  { slug: "niska", name: "Niska", photo: "/assets/voice-catalog/niska.jpg" },
  { slug: "booba", name: "Booba", photo: "/assets/voice-catalog/booba.jpg" },
  { slug: "jul", name: "Jul", photo: "/assets/voice-catalog/jul.jpg" },
  { slug: "damso", name: "Damso", photo: "/assets/voice-catalog/damso.jpg" },
  { slug: "ninho", name: "Ninho", photo: "/assets/voice-catalog/ninho.jpg" },
  { slug: "sch", name: "SCH", photo: "/assets/voice-catalog/sch.jpg" },
  { slug: "gazo", name: "Gazo", photo: "/assets/voice-catalog/gazo.jpg" },
  { slug: "plk", name: "PLK", photo: "/assets/voice-catalog/plk.jpg" },
  { slug: "sdm", name: "SDM", photo: "/assets/voice-catalog/sdm.jpg" },
  { slug: "tiakola", name: "Tiakola", photo: "/assets/voice-catalog/tiakola.jpg" },
];

export const LANDING_VOICE_DEFAULT_SLUG = "gims";

export function buildLandingVoiceScript(name: string): string {
  return `Salut, je me présente, c'est ${name} — j'ai été généré par LuxeFlexIA.`;
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
