/** Lien créateur : capture du code (?ref=CODE ou /c/CODE), 1er contact conservé 30 jours. */
const KEY = "luxeflexia:creator-ref";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const CODE_RE = /^[A-Za-z0-9]{3,24}$/;

export function normalizeCreatorCode(raw: string | null | undefined): string | null {
  const code = String(raw ?? "").trim();
  return CODE_RE.test(code) ? code.toUpperCase() : null;
}

export function readCreatorRef(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || "null");
    if (!parsed?.code || Date.now() - Number(parsed.at) > MAX_AGE_MS) return null;
    return normalizeCreatorCode(parsed.code);
  } catch {
    return null;
  }
}

export function storeCreatorRef(raw: string | null | undefined): void {
  const code = normalizeCreatorCode(raw);
  if (!code || typeof window === "undefined") return;
  if (readCreatorRef()) return; // premier contact conservé
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

/** Code saisi à la main (inscription / réglages) : remplace un éventuel code mémorisé. */
export function setCreatorRef(raw: string | null | undefined): boolean {
  const code = normalizeCreatorCode(raw);
  if (!code || typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function clearCreatorRef(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function captureCreatorRefFromSearch(search: string): void {
  try {
    storeCreatorRef(new URLSearchParams(search).get("ref"));
  } catch {
    /* ignore */
  }
}

// Capture dès le chargement du site, quelle que soit la page d'arrivée.
if (typeof window !== "undefined") {
  captureCreatorRefFromSearch(window.location.search);
}
