import type { VoiceCatalogEntry } from "./voice-catalog";

export type StudioMode = "image" | "voice";

export type SelectedVoice =
  | { kind: "catalog"; id: string; name: string; category: string }
  | { kind: "cloned"; id: string; name: string; category: string };

const SELECTED_KEY = "luxeflexia:selected-voice-v2";
const MODE_KEY = "luxeflexia:studio-mode";

export function getSelectedVoice(): SelectedVoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SELECTED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SelectedVoice;
    if (
      parsed &&
      (parsed.kind === "catalog" || parsed.kind === "cloned") &&
      typeof parsed.id === "string" &&
      typeof parsed.name === "string"
    ) {
      return { ...parsed, category: parsed.category ?? "Rap" };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function setSelectedVoice(voice: SelectedVoice | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!voice) {
      window.localStorage.removeItem(SELECTED_KEY);
    } else {
      window.localStorage.setItem(SELECTED_KEY, JSON.stringify(voice));
    }
    window.dispatchEvent(
      new CustomEvent("luxeflexia:selected-voice", { detail: voice }),
    );
  } catch {
    /* ignore */
  }
}

export function selectCatalogVoice(entry: VoiceCatalogEntry): void {
  setSelectedVoice({
    kind: "catalog",
    id: entry.id,
    name: entry.name,
    category: entry.category,
  });
  setStudioMode("voice");
}

export function setStudioMode(mode: StudioMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MODE_KEY, mode);
    window.dispatchEvent(
      new CustomEvent("luxeflexia:studio-mode", { detail: { mode } }),
    );
  } catch {
    /* ignore */
  }
}

export function getStudioMode(): StudioMode {
  if (typeof window === "undefined") return "image";
  try {
    return window.localStorage.getItem(MODE_KEY) === "voice"
      ? "voice"
      : "image";
  } catch {
    return "image";
  }
}
