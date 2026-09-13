import {
  landingVoiceDemoPrimarySrc,
  landingVoiceDemoStaticSrc,
} from "@/lib/landing-voice-demo";

export type LandingVoiceAudioStage = "api" | "static" | "failed";

const STAGE_KEY = "landingVoiceStage";

export function getLandingVoiceAudioStage(audio: HTMLAudioElement): LandingVoiceAudioStage {
  const stage = audio.dataset[STAGE_KEY];
  if (stage === "static" || stage === "failed") return stage;
  return "api";
}

/** Crée un lecteur avec repli API → MP3 statique embarqué. */
export function createLandingVoiceAudio(slug: string): HTMLAudioElement {
  const audio = new Audio(landingVoiceDemoPrimarySrc(slug));
  audio.preload = "auto";
  audio.dataset[STAGE_KEY] = "api";

  audio.addEventListener("error", () => {
    const stage = getLandingVoiceAudioStage(audio);
    if (stage === "api") {
      audio.dataset[STAGE_KEY] = "static";
      audio.src = landingVoiceDemoStaticSrc(slug);
      audio.load();
      return;
    }
    if (stage === "static") {
      audio.dataset[STAGE_KEY] = "failed";
    }
  });

  return audio;
}

export function isLandingVoiceAudioFailed(audio: HTMLAudioElement): boolean {
  return getLandingVoiceAudioStage(audio) === "failed";
}
