/** Crisp visible uniquement pour abonnés actifs (+ admin). */

let subscriberAllowed = false;
let overlaySuppressed = false;

function pushCrisp(command: "chat:show" | "chat:hide") {
  try {
    window.$crisp?.push(["do", command]);
  } catch {
    /* ignore */
  }
}

export function syncCrispVisibility() {
  if (overlaySuppressed || !subscriberAllowed) {
    pushCrisp("chat:hide");
  } else {
    pushCrisp("chat:show");
  }
}

export function setCrispSubscriberAllowed(allowed: boolean) {
  subscriberAllowed = allowed;
  syncCrispVisibility();
}

/** Plein écran génération / modales — masque temporairement sans perdre le droit abonné. */
export function setCrispOverlaySuppressed(suppressed: boolean) {
  overlaySuppressed = suppressed;
  syncCrispVisibility();
}

export function canUseCrispChat(profile: {
  role?: string | null;
  is_subscriber?: boolean | null;
} | null): boolean {
  if (!profile) return false;
  if (profile.role === "admin") return true;
  return Boolean(profile.is_subscriber);
}

/** Ouvre le chat seulement si l'utilisateur est abonné (ou admin). */
export function openCrispChat() {
  if (!subscriberAllowed || overlaySuppressed) return;
  try {
    window.$crisp?.push(["do", "chat:open"]);
  } catch {
    /* ignore */
  }
}
