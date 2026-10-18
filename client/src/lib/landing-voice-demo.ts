import catalog from "@shared/voice-catalog.json";
import {
  buildLandingVoiceScript as buildSharedLandingVoiceScript,
  normalizeVoiceLocale,
} from "@shared/voice-locale-scripts";
import { APP_LOCALE_STORAGE_KEY } from "@shared/locales";

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
  demoVideo?: string;
  demoCloneAudio?: string;
  demoOriginalVideo?: string;
  demoOriginalAudio?: string;
  studioPremium?: boolean;
};

/** Incrémenter pour invalider le cache navigateur des aperçus voix landing. */
export const LANDING_VOICE_DEMO_VERSION = 16;

/** Démos studio premium — ordre landing / tests voix IA. */
export const LANDING_VOICE_FEATURED_SLUGS = ["niska", "kaaris", "plk", "damso"] as const;

export const LANDING_VOICE_CATALOG = catalog.entries as LandingVoiceEntry[];

/** Voix affichées sur la landing (4 rappeurs studio premium). */
export const LANDING_VOICE_FEATURED: LandingVoiceEntry[] = LANDING_VOICE_FEATURED_SLUGS.map(
  (slug) => LANDING_VOICE_CATALOG.find((e) => e.slug === slug),
).filter(Boolean) as LandingVoiceEntry[];

export const LANDING_VOICE_DEFAULT_SLUG = "niska";

export function pickRandomLandingVoiceSlug(): string {
  if (LANDING_VOICE_FEATURED.length === 0) return LANDING_VOICE_DEFAULT_SLUG;
  const index = Math.floor(Math.random() * LANDING_VOICE_FEATURED.length);
  return LANDING_VOICE_FEATURED[index]?.slug ?? LANDING_VOICE_DEFAULT_SLUG;
}

/** MP4 démo studio (même fichier que bibliothèque). */
export function landingVoiceDemoVideoSrc(slug: string): string {
  const entry = LANDING_VOICE_CATALOG.find((e) => e.slug === slug);
  const path = entry?.demoVideo || `/voices/${encodeURIComponent(slug)}.mp4`;
  return `${path}?v=${LANDING_VOICE_DEMO_VERSION}`;
}

function readActiveVoiceLocale(): string {
  if (typeof window === "undefined") return "fr";
  const stored = window.localStorage.getItem(APP_LOCALE_STORAGE_KEY);
  const htmlLang = document.documentElement.lang;
  return normalizeVoiceLocale(stored || htmlLang || "fr");
}

export function buildLandingVoiceScript(entry: Pick<LandingVoiceEntry, "name" | "demoKind">): string {
  return buildSharedLandingVoiceScript(entry, readActiveVoiceLocale());
}

function currentVoiceLocaleParam(): string {
  return readActiveVoiceLocale();
}

export function landingVoicePhoto(entry: LandingVoiceEntry): string | null {
  if (!entry.photo) return null;
  return `/assets/voice-catalog/${entry.photo}`;
}

/** MP3 statiques landing — intro personnalisée (alignée sous-titres). */
export function landingVoiceDemoStaticSrc(slug: string): string {
  const entry = LANDING_VOICE_CATALOG.find((e) => e.slug === slug);
  if (entry?.demoCloneAudio) {
    return `${entry.demoCloneAudio}?v=${LANDING_VOICE_DEMO_VERSION}`;
  }
  return `/assets/landing-voice-demos/${encodeURIComponent(slug)}.mp3?v=${LANDING_VOICE_DEMO_VERSION}`;
}

export function landingVoiceDemoOriginalSrc(slug: string): string | null {
  const entry = LANDING_VOICE_CATALOG.find((e) => e.slug === slug);
  if (entry?.demoOriginalAudio) {
    return `${entry.demoOriginalAudio}?v=${LANDING_VOICE_DEMO_VERSION}`;
  }
  return null;
}

/** Ancien chemin prod — réécrit vers l’API landing (vercel.json). */
export function landingVoiceDemoLegacySampleSrc(slug: string): string {
  return `/assets/voice-catalog/samples/${encodeURIComponent(slug)}.mp3?v=${LANDING_VOICE_DEMO_VERSION}`;
}

/** Repli API si le MP3 statique est absent. */
export function landingVoiceDemoApiSrc(slug: string): string {
  const lang = currentVoiceLocaleParam();
  return `/api/larps/voice/landing-demo?slug=${encodeURIComponent(slug)}&lang=${lang}&media=1&v=${LANDING_VOICE_DEMO_VERSION}`;
}

/** @deprecated alias */
export function landingVoiceDemoPrimarySrc(slug: string): string {
  return landingVoiceDemoStaticSrc(slug);
}

export function landingVoiceDemoSrc(slug: string): string {
  return landingVoiceDemoStaticSrc(slug);
}

export function isAudioReady(audio: HTMLAudioElement): boolean {
  return audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA;
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
