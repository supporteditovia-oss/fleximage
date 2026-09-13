const STORAGE_KEY = "luxeflexia_paywall_voice_label";

/** Nom affiché sur l’aperçu cadenas (ex. Maes, Maître Gims). */
export function savePaywallVoiceLabel(label: string): void {
  try {
    const cleaned = label.trim();
    if (!cleaned) {
      clearPaywallVoiceLabel();
      return;
    }
    localStorage.setItem(STORAGE_KEY, cleaned.slice(0, 80));
  } catch {
    /* quota */
  }
}

export function getPaywallVoiceLabel(): string | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value?.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

export function clearPaywallVoiceLabel(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
