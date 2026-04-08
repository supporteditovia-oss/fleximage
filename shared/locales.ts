export const SUPPORTED_LOCALES = ["fr", "en", "es", "de"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "fr";
export const APP_LOCALE_STORAGE_KEY = "app_locale";
export const SIGNUP_LOCALE_STORAGE_KEY = "signup_locale";

export function isSupportedLocale(value: string): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale);
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
