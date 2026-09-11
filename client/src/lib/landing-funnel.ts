import { markOnboardingResume } from "@/lib/onboarding-resume";
import { savePaywallPrompt } from "@/lib/paywall-prompt";
import { savePaywallImage, clearPaywallImage } from "@/lib/paywall-image";
import { clearPaywallExpiry } from "@/lib/paywall-expiry";
import { writeStudioMode, type StudioMode } from "@/lib/v2-experience";

export type LandingFunnelMode = "image" | "voice" | "video";

export function previewPathForMode(mode: LandingFunnelMode): string {
  if (mode === "voice") return "/voix-prete?paywall=1";
  if (mode === "video") return "/video-prete?paywall=1";
  return "/image-prete?paywall=1";
}

/** Prépare le funnel marketing (guest → register → faux loader → cadenas). */
export async function startLandingGuestFunnel(params: {
  mode: LandingFunnelMode;
  prompt: string;
  imageFile?: File | null;
}): Promise<void> {
  const prompt = params.prompt.trim();
  writeStudioMode(params.mode as StudioMode);

  markOnboardingResume({
    prompt,
    generationMode: params.mode,
  });
  savePaywallPrompt(prompt);
  clearPaywallExpiry();

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
