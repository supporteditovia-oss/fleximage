const STORAGE_KEY = "turboprank_paywalled_result";

export interface PaywalledResult {
  taskId: string;
  prankId: string;
  resultUrls: string[];
  savedAt: number;
}

const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function savePaywalledResult(data: Omit<PaywalledResult, "savedAt">): void {
  try {
    const entry: PaywalledResult = { ...data, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // silent fail (quota exceeded, etc.)
  }
}

export function getPaywalledResult(): PaywalledResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data: PaywalledResult = JSON.parse(raw);
    if (Date.now() - data.savedAt > EXPIRY_MS) {
      clearPaywalledResult();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearPaywalledResult(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent fail
  }
}
