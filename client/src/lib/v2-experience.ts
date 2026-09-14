export type V2AccessProfile = {
  role?: string | null;
  is_subscriber?: boolean | null;
  credits?: number | null;
};

/**
 * Studio V2 — preview admin uniquement tant que Voix / Vidéo / Modèles ne sont pas finalisés.
 */
export function isV2ExperienceEnabled(
  profile: V2AccessProfile | null | undefined,
  isAdmin = false,
): boolean {
  return isAdmin || profile?.role === "admin";
}

export type StudioMode = "image" | "voice" | "video";

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
  if (raw === "voice") return "voice";
  if (raw === "video") return "video";
  return "image";
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

/** Sélection voix — persistée en localStorage pour réutiliser après refresh. */
function readPersistedVoiceId(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(key);
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

let selectedCatalogVoiceId: string | null = readPersistedVoiceId(SELECTED_VOICE_KEY);
let selectedClonedVoiceId: string | null = readPersistedVoiceId(
  SELECTED_CLONED_VOICE_KEY,
);

export function readSelectedCatalogVoiceId(): string | null {
  return selectedCatalogVoiceId;
}

export function writeSelectedCatalogVoiceId(id: string | null): void {
  if (typeof window === "undefined") return;
  selectedCatalogVoiceId = id;
  if (id) selectedClonedVoiceId = null;
  try {
    if (id) {
      window.localStorage.setItem(SELECTED_VOICE_KEY, id);
      window.localStorage.removeItem(SELECTED_CLONED_VOICE_KEY);
    } else {
      window.localStorage.removeItem(SELECTED_VOICE_KEY);
    }
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
    if (id) {
      window.localStorage.setItem(SELECTED_CLONED_VOICE_KEY, id);
      window.localStorage.removeItem(SELECTED_VOICE_KEY);
    } else {
      window.localStorage.removeItem(SELECTED_CLONED_VOICE_KEY);
    }
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

/** Route cible pour un mode studio (navigation principale). */
export function studioPathForMode(mode: StudioMode): string {
  if (mode === "video") return "/video-ia";
  return "/create";
}

/** Mode actif déduit de l'URL courante. */
export function studioModeFromPath(pathname: string): StudioMode | null {
  if (pathname === "/video-ia" || pathname.startsWith("/video-ia/")) {
    return "video";
  }
  if (pathname === "/create" || pathname.startsWith("/create/")) {
    return readStudioMode();
  }
  return null;
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
