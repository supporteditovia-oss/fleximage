import {
  getOnboardingResume,
  markOnboardingResume,
} from "@/lib/onboarding-resume";
import { savePaywallPrompt, getPaywallPrompt } from "@/lib/paywall-prompt";
import { savePaywallImage, clearPaywallImage, getPaywallImage } from "@/lib/paywall-image";
import { clearPaywallExpiry } from "@/lib/paywall-expiry";
import {
  savePaywallVoiceLabel,
  clearPaywallVoiceLabel,
} from "@/lib/paywall-voice-meta";
import { createPathForUser, writeStudioMode, type StudioMode } from "@/lib/v2-experience";

export type LandingFunnelMode = "image" | "voice" | "video";

export function previewPathForMode(mode: LandingFunnelMode): string {
  if (mode === "voice") return "/voix-prete?paywall=1";
  if (mode === "video") return "/video-prete?paywall=1";
  return "/image-prete?paywall=1";
}

export function hasPendingOnboardingFunnel(): boolean {
  const resume = getOnboardingResume();
  if (!resume) return false;
  if (resume.generationMode === "voice") {
    return Boolean(getPaywallPrompt()?.trim());
  }
  if (resume.generationMode === "video") {
    return Boolean(getPaywallPrompt()?.trim() || getPaywallImage());
  }
  return Boolean(getPaywallImage());
}

/** Route post-/welcome selon le brouillon landing (voix/vidéo ≠ admin-only /create). */
export function pathAfterWelcome(v2Enabled: boolean): string {
  const resume = getOnboardingResume();
  if (!resume) return createPathForUser(v2Enabled);
  if (resume.generationMode === "voice" || resume.generationMode === "video") {
    return "/onboarding-resume";
  }
  return createPathForUser(v2Enabled);
}

/** Prépare le funnel marketing (guest → register → faux loader → cadenas). */
export async function startLandingGuestFunnel(params: {
  mode: LandingFunnelMode;
  prompt: string;
  imageFile?: File | null;
  voiceLabel?: string | null;
}): Promise<void> {
  const prompt = params.prompt.trim();
  writeStudioMode(params.mode as StudioMode);

  markOnboardingResume({
    prompt,
    generationMode: params.mode,
  });
  savePaywallPrompt(prompt);
  clearPaywallExpiry();

  if (params.mode === "voice" && params.voiceLabel?.trim()) {
    savePaywallVoiceLabel(params.voiceLabel);
  } else if (params.mode !== "voice") {
    clearPaywallVoiceLabel();
  }

  if (params.imageFile) {
    try {
      await savePaywallImage(params.imageFile);
    } catch {
      /* quota */
    }
  } else if (params.mode !== "image") {
    clearPaywallImage();
  }
}
