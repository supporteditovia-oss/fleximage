import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import {
  APP_LOCALE_STORAGE_KEY,
  DEFAULT_LOCALE,
  type AppLocale,
  SUPPORTED_LOCALES,
  resolvePreferredLocale,
} from "@shared/locales";
import { resources as baseResources } from "./resources";
import { extraResources } from "./resources-extra";

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

  // Prefer an explicit user choice; otherwise always French for this product.
  const stored = window.localStorage.getItem(APP_LOCALE_STORAGE_KEY);
  if (stored) {
    return resolvePreferredLocale(stored, DEFAULT_LOCALE);
  }
  return DEFAULT_LOCALE;
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
      ],
      detection: {
        // Do not auto-switch to English from the phone browser language.
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

// One-time fix: older builds cached English from the phone browser.
// Prefer French unless the user explicitly chose another language in Settings.
const LOCALE_CHOSEN_KEY = "luxeflexia:locale_chosen";
if (typeof window !== "undefined") {
  const chosen = window.localStorage.getItem(LOCALE_CHOSEN_KEY);
  const stored = window.localStorage.getItem(APP_LOCALE_STORAGE_KEY);
  if (!chosen && stored === "en") {
    window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, DEFAULT_LOCALE);
    void i18n.changeLanguage(DEFAULT_LOCALE);
  }
}

i18n.on("languageChanged", (lng) => {
  const normalized = resolvePreferredLocale(lng, DEFAULT_LOCALE);

  if (typeof document !== "undefined") {
    document.documentElement.lang = normalized;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, normalized);
  }
});

export function setAppLanguage(locale: string) {
  const normalized = resolvePreferredLocale(locale, DEFAULT_LOCALE);

  if (typeof window !== "undefined") {
    window.localStorage.setItem("luxeflexia:locale_chosen", "1");
  }

  if (i18n.resolvedLanguage !== normalized) {
    void i18n.changeLanguage(normalized);
  }
}

export default i18n;
