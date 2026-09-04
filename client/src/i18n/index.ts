import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import {
  APP_LOCALE_STORAGE_KEY,
  DEFAULT_LOCALE,
  type AppLocale,
  SIGNUP_LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  detectVisitorUiLocale,
  toUiLocale,
  normalizeLocale,
  resolvePreferredLocale,
} from "@shared/locales";
import { resources as baseResources } from "./resources";
import { extraResources } from "./resources-extra";

export const LOCALE_CHOSEN_KEY = "luxeflexia:locale_chosen";

export function readLocaleFromSearch(
  search = typeof window === "undefined" ? "" : window.location.search,
): AppLocale | null {
  const params = new URLSearchParams(search);
  return normalizeLocale(params.get("lang") || params.get("locale"));
}

export function persistExplicitLocale(
  locale: AppLocale,
  options?: { trackSignupLocale?: boolean },
) {
  if (typeof window === "undefined") return;
  const ui = toUiLocale(locale);
  window.localStorage.setItem(LOCALE_CHOSEN_KEY, "1");
  window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, ui);
  if (options?.trackSignupLocale !== false) {
    window.localStorage.setItem(SIGNUP_LOCALE_STORAGE_KEY, ui);
  }
}

const resources = SUPPORTED_LOCALES.reduce((acc, locale) => {
  const key = locale as AppLocale;
  const localeResources = {
    ...baseResources[key],
    ...extraResources[key],
  };

  // Compatibility layer: many screens call t("settings.title") / t("common.actions.save")
  // without explicit namespace. We mirror all namespaces under `common` so those keys resolve.
  const namespaceMirror: Record<string, any> = {};
  for (const [namespace, value] of Object.entries(localeResources)) {
    namespaceMirror[namespace] = value;
  }

  localeResources.common = {
    ...(localeResources.common ?? {}),
    ...namespaceMirror,
  };

  acc[key] = localeResources;
  return acc;
}, {} as Record<AppLocale, any>);

const getInitialLocale = () => {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const fromQuery = readLocaleFromSearch();
  if (fromQuery) {
    persistExplicitLocale(fromQuery);
    return toUiLocale(fromQuery);
  }

  const stored = window.localStorage.getItem(APP_LOCALE_STORAGE_KEY);
  if (stored) {
    return toUiLocale(resolvePreferredLocale(stored, DEFAULT_LOCALE));
  }

  const detected = detectVisitorUiLocale();
  persistExplicitLocale(detected);
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.get("lang") && !url.searchParams.get("locale")) {
      url.searchParams.set("lang", detected);
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }
  } catch {
    /* ignore */
  }
  return detected;
};

const initialLocale = getInitialLocale();

if (!i18n.isInitialized) {
  void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLocale,
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: [...SUPPORTED_LOCALES],
      defaultNS: "common",
      ns: [
        "common",
        "settings",
        "auth",
        "paywall",
        "errors",
        "meta",
        "layout",
        "hero",
        "generate",
        "promptInput",
        "templateGallery",
        "imageUpload",
        "progress",
        "history",
        "result",
        "faq",
        "cta",
        "footer",
        "marquee",
        "larpPro",
        "legalCommon",
        "notFound",
        "billing",
        "landing",
        "zeroCredits",
        "welcome",
      ],
      detection: {
        order: ["localStorage"],
        lookupLocalStorage: APP_LOCALE_STORAGE_KEY,
        caches: ["localStorage"],
      },
      interpolation: {
        escapeValue: false,
      },
      returnNull: false,
    });
}

if (typeof document !== "undefined") {
  document.documentElement.lang = i18n.resolvedLanguage ?? initialLocale;
}

i18n.on("languageChanged", (lng) => {
  const normalized = toUiLocale(resolvePreferredLocale(lng, DEFAULT_LOCALE));

  if (typeof document !== "undefined") {
    document.documentElement.lang = normalized;
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale instanceof HTMLMetaElement) {
      ogLocale.content = normalized === "en" ? "en_US" : "fr_FR";
    }
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, normalized);
    const crisp = window.$crisp;
    if (Array.isArray(crisp)) {
      crisp.push(["set", "user:language", normalized]);
    }
  }
});

export function setAppLanguage(
  locale: string,
  options?: { trackSignupLocale?: boolean },
) {
  const normalized = toUiLocale(resolvePreferredLocale(locale, DEFAULT_LOCALE));
  persistExplicitLocale(normalized, options);

  if (i18n.resolvedLanguage !== normalized) {
    void i18n.changeLanguage(normalized);
  } else if (typeof document !== "undefined") {
    document.documentElement.lang = normalized;
  }
}

export function applyLocaleFromSearch(search?: string) {
  if (typeof window === "undefined") return;
  const fromQuery = readLocaleFromSearch(search ?? window.location.search);
  if (fromQuery) {
    setAppLanguage(fromQuery);
  }
}

export default i18n;
