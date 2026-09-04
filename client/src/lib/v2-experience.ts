/**
 * LuxeFlexIA V2 — réservé aux comptes admin.
 * Les utilisateurs normaux ne voient jamais les surfaces V2.
 */
export function isV2ExperienceEnabled(isAdmin: boolean): boolean {
  return isAdmin;
}

export type StudioMode = "image" | "voice";

const STUDIO_MODE_KEY = "luxeflexia:studio-mode";
const V2_ENABLED_KEY = "luxeflexia:v2-enabled";

export function markV2ExperienceEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      sessionStorage.setItem(V2_ENABLED_KEY, "1");
    } else {
      sessionStorage.removeItem(V2_ENABLED_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function readStudioMode(): StudioMode {
  if (typeof window === "undefined") return "image";
  const raw = window.localStorage.getItem(STUDIO_MODE_KEY);
  return raw === "voice" ? "voice" : "image";
}

export function writeStudioMode(mode: StudioMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STUDIO_MODE_KEY, mode);
  window.dispatchEvent(
    new CustomEvent("luxeflexia:studio-mode", { detail: { mode } }),
  );
}

const SELECTED_VOICE_KEY = "luxeflexia:selected-catalog-voice";
const SELECTED_CLONED_VOICE_KEY = "luxeflexia:selected-cloned-voice";

/** Sélection voix — session SPA uniquement (effacée au refresh). */
let selectedCatalogVoiceId: string | null = null;
let selectedClonedVoiceId: string | null = null;

if (typeof window !== "undefined") {
  try {
    window.localStorage.removeItem(SELECTED_VOICE_KEY);
    window.localStorage.removeItem(SELECTED_CLONED_VOICE_KEY);
  } catch {
    /* ignore */
  }
}

export function readSelectedCatalogVoiceId(): string | null {
  return selectedCatalogVoiceId;
}

export function writeSelectedCatalogVoiceId(id: string | null): void {
  if (typeof window === "undefined") return;
  selectedCatalogVoiceId = id;
  if (id) selectedClonedVoiceId = null;
  try {
    window.dispatchEvent(
      new CustomEvent("luxeflexia:selected-voice", { detail: { id } }),
    );
  } catch {
    /* ignore */
  }
}

export function readSelectedClonedVoiceId(): string | null {
  return selectedClonedVoiceId;
}

export function writeSelectedClonedVoiceId(id: string | null): void {
  if (typeof window === "undefined") return;
  selectedClonedVoiceId = id;
  if (id) selectedCatalogVoiceId = null;
  try {
    window.dispatchEvent(
      new CustomEvent("luxeflexia:selected-voice", { detail: { id } }),
    );
  } catch {
    /* ignore */
  }
}

export function clearSelectedVoice(): void {
  writeSelectedCatalogVoiceId(null);
  writeSelectedClonedVoiceId(null);
}

export function createPathForUser(v2Enabled: boolean): string {
  return v2Enabled ? "/create" : "/generate";
}

export function libraryPathForUser(v2Enabled: boolean): string {
  return v2Enabled ? "/bibliotheque" : "/historique";
}

/** Error recovery / home button — respects admin V2 routes. */
export function studioHomePath(): string {
  if (typeof window === "undefined") return "/generate";
  const path = window.location.pathname;
  if (path.startsWith("/admin")) return "/admin/users";
  if (path === "/create" || path === "/bibliotheque") return "/create";
  try {
    if (sessionStorage.getItem(V2_ENABLED_KEY) === "1") return "/create";
  } catch {
    /* ignore */
  }
  return "/generate";
}
