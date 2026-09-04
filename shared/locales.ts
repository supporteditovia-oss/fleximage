export const SUPPORTED_LOCALES = ["fr", "en", "es", "de"] as const;
export const UI_LOCALES = ["fr", "en"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export type UiLocale = (typeof UI_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "fr";
export const APP_LOCALE_STORAGE_KEY = "app_locale";
export const SIGNUP_LOCALE_STORAGE_KEY = "signup_locale";

export function isSupportedLocale(value: string): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale);
}

export function isUiLocale(value: string): value is UiLocale {
  return UI_LOCALES.includes(value as UiLocale);
}

export function toUiLocale(value: string | null | undefined): UiLocale {
  return value === "en" ? "en" : "fr";
}

/** First visit: English phones / US timezones → EN, French phones → FR. */
export function detectVisitorUiLocale(): UiLocale {
  if (typeof navigator === "undefined") return "fr";

  const langs = [...(navigator.languages || []), navigator.language]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

  const primary = langs[0] || "";
  if (primary.startsWith("fr")) return "fr";
  if (primary.startsWith("en")) return "en";
  if (langs.some((value) => value.startsWith("fr"))) return "fr";
  if (langs.some((value) => value.startsWith("en"))) return "en";

  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (
      timeZone.startsWith("America/") ||
      timeZone.startsWith("US/") ||
      timeZone === "Pacific/Honolulu"
    ) {
      return "en";
    }
  } catch {
    /* ignore */
  }

  return "fr";
}

export function normalizeLocale(value: string | null | undefined): AppLocale | null {
  if (!value) return null;

  const candidate = value.trim().toLowerCase();
  if (!candidate) return null;

  const withoutQuality = candidate.split(";")[0]?.trim();
  if (!withoutQuality) return null;

  const language = withoutQuality.split("-")[0]?.trim();
  if (!language) return null;

  return isSupportedLocale(language) ? language : null;
}

export function resolvePreferredLocale(
  requested: string | null | undefined,
  fallback: AppLocale = DEFAULT_LOCALE,
): AppLocale {
  return normalizeLocale(requested) ?? fallback;
}
