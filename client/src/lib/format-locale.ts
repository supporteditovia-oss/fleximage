import { DEFAULT_LOCALE, resolvePreferredLocale } from "@shared/locales";

/** Never throw from Intl — invalid locales have crashed the ErrorBoundary. */
export function safeLocale(locale?: string | null): string {
  return resolvePreferredLocale(locale, DEFAULT_LOCALE);
}

/** Solde crédits toujours en chiffre lisible (jamais « 1 Md » / compact). */
export function formatCredits(value: number, locale?: string | null): string {
  const n = Number.isFinite(value) ? value : 0;
  const lang = safeLocale(locale);
  try {
    return n.toLocaleString(lang);
  } catch {
    return String(n);
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
