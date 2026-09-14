import { hasPendingOnboardingFunnel } from "@/lib/landing-funnel";
import { clearOnboardingQuiz } from "@/lib/onboarding-quiz";
import { clearFakePaywallReached } from "@/lib/fake-paywall-state";
import { clearPaywallImage } from "@/lib/paywall-image";
import { clearPaywallPrompt } from "@/lib/paywall-prompt";
import { clearPaywallExpiry } from "@/lib/paywall-expiry";
import { clearOnboardingResume } from "@/lib/onboarding-resume";

const LAST_AUTH_USER_KEY = "luxeflexia_last_auth_user_id";

export function getLastAuthUserId(): string | null {
  try {
    return localStorage.getItem(LAST_AUTH_USER_KEY);
  } catch {
    return null;
  }
}

export function setLastAuthUserId(userId: string): void {
  try {
    localStorage.setItem(LAST_AUTH_USER_KEY, userId);
  } catch {
    /* quota / private mode */
  }
}

/** Nettoie le funnel local quand on change de compte sur le même navigateur. */
export function resetFunnelForNewAccount(options?: {
  preserveGuestDraft?: boolean;
}): void {
  clearOnboardingQuiz();
  clearFakePaywallReached();

  if (options?.preserveGuestDraft) return;

  clearPaywallImage();
  clearPaywallPrompt();
  clearPaywallExpiry();
  clearOnboardingResume();
}

/** À appeler après connexion — préserve le brouillon landing si inscription en cours. */
export function handleAuthUserChange(userId: string): void {
  const lastId = getLastAuthUserId();
  const guestDraft = hasPendingOnboardingFunnel();

  if (lastId && lastId !== userId) {
    resetFunnelForNewAccount({ preserveGuestDraft: guestDraft });
  } else if (!lastId && !guestDraft) {
    // Premier login sur ce navigateur sans brouillon guest : évite l'héritage stale.
    resetFunnelForNewAccount();
  } else if (!lastId && guestDraft) {
    clearOnboardingQuiz();
    clearFakePaywallReached();
  }

  setLastAuthUserId(userId);
}
