import {
  buildPromptFromQuiz,
  getOnboardingQuiz,
} from "@/lib/onboarding-quiz";
import { dataUrlToFile } from "@/lib/onboarding-resume";
import { clearPaywallExpiry } from "@/lib/paywall-expiry";
import { clearPaywallImage, getPaywallImage } from "@/lib/paywall-image";
import { clearPaywallPrompt, getPaywallPrompt } from "@/lib/paywall-prompt";
import { clearPendingLarp, savePendingLarp } from "@/lib/pending-larp";
import { clearFakePaywallReached } from "@/lib/fake-paywall-state";
import { clearOnboardingResume } from "@/lib/onboarding-resume";
import { studioHomePath } from "@/lib/v2-experience";

export type CheckoutSuccessPath = "/create" | "/generate" | "/resultat";

/** Route post-Stripe pour lancer l'auto-génération (playbook : valeur → paywall → génération HD). */
export function resolveCheckoutSuccessPath(): CheckoutSuccessPath {
  const home = studioHomePath();
  return home === "/create" ? "/create" : "/generate";
}

export function resolveFunnelPromptForGeneration(
  rawPrompt?: string | null,
): string {
  const base = (rawPrompt ?? getPaywallPrompt() ?? "").trim();
  const quiz = getOnboardingQuiz();
  if (!quiz) return base;
  return buildPromptFromQuiz(base, quiz).trim();
}

/**
 * IndexedDB draft avant redirection Stripe — survit au retour même si onboarding resume effacé.
 */
export async function persistFunnelDraftBeforeCheckout(params?: {
  imageUrl?: string | null;
  prompt?: string | null;
  generationMode?: "image" | "video";
}): Promise<void> {
  const imageDataUrl = params?.imageUrl ?? getPaywallImage();
  if (!imageDataUrl) return;

  const file = dataUrlToFile(imageDataUrl);
  if (!file) return;

  const prompt = resolveFunnelPromptForGeneration(params?.prompt);

  await savePendingLarp({
    prompt,
    images: [file],
    generationMode: params?.generationMode === "video" ? "video" : "image",
    timestamp: Date.now(),
  });
}

export function hasFunnelDraftForPostPayment(): boolean {
  return Boolean(getPaywallImage()) || Boolean(getPaywallPrompt()?.trim());
}

/** Nettoie le brouillon funnel après génération HD ou déblocage réussi. */
export function clearFunnelDraftAfterPayment(): void {
  clearPendingLarp();
  clearPaywallImage();
  clearPaywallPrompt();
  clearPaywallExpiry();
  clearOnboardingResume();
  clearFakePaywallReached();
}
