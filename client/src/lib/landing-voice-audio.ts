import {
  landingVoiceDemoApiSrc,
  landingVoiceDemoStaticSrc,
} from "@/lib/landing-voice-demo";

export type LandingVoiceAudioStage = "static" | "api" | "failed";

const STAGE_KEY = "landingVoiceStage";

export function getLandingVoiceAudioStage(audio: HTMLAudioElement): LandingVoiceAudioStage {
  const stage = audio.dataset[STAGE_KEY];
  if (stage === "api" || stage === "failed") return stage;
  return "static";
}

/** MP3 statique d’abord (intro = sous-titres), puis API en repli. */
export function createLandingVoiceAudio(slug: string): HTMLAudioElement {
  const audio = new Audio(landingVoiceDemoStaticSrc(slug));
  audio.preload = "auto";
  audio.dataset[STAGE_KEY] = "static";

  audio.addEventListener("error", () => {
    const stage = getLandingVoiceAudioStage(audio);
    if (stage === "static") {
      audio.dataset[STAGE_KEY] = "api";
      audio.src = landingVoiceDemoApiSrc(slug);
      audio.load();
      return;
    }
    if (stage === "api") {
      audio.dataset[STAGE_KEY] = "failed";
    }
  });

  return audio;
}

export function isLandingVoiceAudioFailed(audio: HTMLAudioElement): boolean {
  return getLandingVoiceAudioStage(audio) === "failed";
}
