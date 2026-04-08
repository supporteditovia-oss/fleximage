import { supabase } from "./supabase";
import i18n from "@/i18n";
import {
  APP_LOCALE_STORAGE_KEY,
  DEFAULT_LOCALE,
  resolvePreferredLocale,
} from "@shared/locales";

export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(options.headers);
  const storedLocale = window.localStorage.getItem(APP_LOCALE_STORAGE_KEY);
  const locale = resolvePreferredLocale(
    i18n.resolvedLanguage ?? storedLocale,
    DEFAULT_LOCALE,
  );

  headers.set("x-locale", locale);

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = i18n.t("errors.generic.serverDefault", {
      defaultValue: "Server error",
    });
    if (text) {
      try {
        const json = JSON.parse(text);
        message = json.message || json.details || message;
      } catch {
        if (!text.startsWith("<")) message = text;
      }
    }
    throw new Error(message);
  }

  return res;
}
