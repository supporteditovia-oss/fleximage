const STORAGE_KEY = "luxeflexia_paywall_prompt";
const MAX_STORED_CHARS = 280;

/** Persist the user's prompt so /image-prete can echo it next to the lock. */
export function savePaywallPrompt(prompt: string): void {
  try {
    const cleaned = prompt.trim().replace(/\s+/g, " ");
    if (!cleaned) {
      clearPaywallPrompt();
      return;
    }
    localStorage.setItem(STORAGE_KEY, cleaned.slice(0, MAX_STORED_CHARS));
  } catch {
    // quota / private mode
  }
}

export function getPaywallPrompt(): string | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value?.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

export function clearPaywallPrompt(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Short display form for UI chips (ellipsis in the middle of long prompts). */
export function formatPaywallPromptPreview(
  prompt: string,
  maxChars = 72,
): string {
  const cleaned = prompt.trim().replace(/\s+/g, " ");
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}
