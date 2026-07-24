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
  // Checkout / verify need a fresh token (iOS Safari + TikTok handoff).
  const needsFreshSession =
    typeof url === "string" &&
    (url.includes("/api/stripe/create-checkout") ||
      url.includes("/api/stripe/verify-session") ||
      url.includes("/api/stripe/create-portal"));

  let session = (await supabase.auth.getSession()).data.session;
  if (needsFreshSession) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.data.session) {
      session = refreshed.data.session;
    }
  }

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

  // Snap START_CHECKOUT when Stripe checkout is initiated (covers paywall CTAs)
  if (
    typeof url === "string" &&
    url.includes("/api/stripe/create-checkout") &&
    (options.method === "POST" || !options.method)
  ) {
    void import("@/lib/snap-pixel").then(({ trackSnapStartCheckout }) => {
      trackSnapStartCheckout();
    });
  }

  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get("Content-Type") ?? "";

  if (
    res.ok &&
    typeof url === "string" &&
    url.startsWith("/api/") &&
    contentType.includes("text/html")
  ) {
    throw new Error(
      i18n.t("errors.generic.serverDefault", {
        defaultValue: "Server error",
      }),
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = i18n.t("errors.generic.serverDefault", {
      defaultValue: "Server error",
    });
    let code: string | undefined;
    if (
      res.status === 413 ||
      /FUNCTION_PAYLOAD_TOO_LARGE|Request Entity Too Large/i.test(text)
    ) {
      message = i18n.t("errors.generic.payloadTooLarge", {
        defaultValue:
          "Image trop lourde. Réessaie — on compresse automatiquement, ou choisis une photo plus légère.",
      });
      code = "FUNCTION_PAYLOAD_TOO_LARGE";
    } else if (text) {
      try {
        const json = JSON.parse(text);
        message = json.message || json.details || message;
        code = json.code;
      } catch {
        const looksMissing =
          res.status === 404 ||
          /NOT_FOUND/i.test(text) ||
          /page could not be found/i.test(text) ||
          /Page introuvable/i.test(text);
        if (looksMissing) {
          message =
            "API indisponible (route introuvable). Vérifie le déploiement backend.";
        } else if (!text.startsWith("<")) {
          message = text.slice(0, 300);
        }
      }
    }
    const error = new Error(message) as Error & { code?: string; status?: number };
    error.code = code;
    error.status = res.status;
    throw error;
  }

  return res;
}
