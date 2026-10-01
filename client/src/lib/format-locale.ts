import { DEFAULT_LOCALE, resolvePreferredLocale } from "@shared/locales";

/** Never throw from Intl — invalid locales have crashed the ErrorBoundary. */
export function safeLocale(locale?: string | null): string {
  return resolvePreferredLocale(locale, DEFAULT_LOCALE);
}

/** Solde crédits toujours en chiffre lisible (jamais « 1 Md » / compact). */
const CREDITS_DISPLAY_CAP = 999_999;

export function formatCredits(value: number, locale?: string | null): string {
  const raw = Number.isFinite(value) ? value : 0;
  const capped = Math.min(Math.max(0, raw), CREDITS_DISPLAY_CAP);
  const lang = safeLocale(locale);
  try {
    const base = capped.toLocaleString(lang);
    return raw > CREDITS_DISPLAY_CAP ? `${base}+` : base;
  } catch {
    return raw > CREDITS_DISPLAY_CAP ? `${CREDITS_DISPLAY_CAP}+` : String(capped);
  }
}

export function formatShortDate(
  iso: string,
  locale?: string | null,
): string | null {
  try {
    return new Intl.DateTimeFormat(safeLocale(locale), {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}
