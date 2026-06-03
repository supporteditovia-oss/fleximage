const STORAGE_KEY = "larpking_fake_paywall_reached";
const SESSION_KEY = "fake_paywall_reached";

export type PaywallGenerationMode = "image" | "video";

type StoredFakePaywallState = {
  userId: string | null;
  reachedAt: number;
  generationMode?: PaywallGenerationMode;
};

function readStoredState(): StoredFakePaywallState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredFakePaywallState;
  } catch {
    return null;
  }
}

export function markFakePaywallReached(
  userId?: string | null,
  generationMode: PaywallGenerationMode = "image",
): void {
  try {
    const entry: StoredFakePaywallState = {
      userId: userId ?? null,
      reachedAt: Date.now(),
      generationMode,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    sessionStorage.setItem(SESSION_KEY, "true");
  } catch {
    // quota / private mode
  }
}

export function hasReachedFakePaywall(userId?: string | null): boolean {
  try {
    if (sessionStorage.getItem(SESSION_KEY) === "true") {
      return true;
    }

    const data = readStoredState();
    if (!data) return false;
    if (userId && data.userId && data.userId !== userId) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function getFakePaywallGenerationMode(
  userId?: string | null,
): PaywallGenerationMode {
  try {
    const data = readStoredState();
    if (!data) return "image";
    if (userId && data.userId && data.userId !== userId) {
      return "image";
    }
    return data.generationMode === "video" ? "video" : "image";
  } catch {
    return "image";
  }
}

export function clearFakePaywallReached(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent fail
  }
}
