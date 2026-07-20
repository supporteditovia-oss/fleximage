import { DEFAULT_LOCALE, resolvePreferredLocale } from "@shared/locales";

/** Never throw from Intl — invalid locales have crashed the ErrorBoundary. */
export function safeLocale(locale?: string | null): string {
  return resolvePreferredLocale(locale, DEFAULT_LOCALE);
}

export function formatCredits(value: number, locale?: string | null): string {
  const n = Number.isFinite(value) ? value : 0;
  const lang = safeLocale(locale);
  try {
    if (n < 100_000) return n.toLocaleString(lang);
    return new Intl.NumberFormat(lang, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
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
