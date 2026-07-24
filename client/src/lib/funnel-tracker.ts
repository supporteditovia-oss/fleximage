import { supabase } from "@/lib/supabase";

export const FUNNEL_STEPS = [
  "landing",
  "signup",
  "upload",
  "generate",
  "preview",
  "paywall",
  "checkout",
  "subscribed",
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

const STORAGE_KEY = "luxeflexia:funnel_session_id";
const ATTR_KEY = "luxeflexia:attribution";
const SENT_PREFIX = "luxeflexia:funnel_sent:";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `fs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function detectDevice(): string {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Mobile/i.test(ua)) return "mobile";
  return "desktop";
}

/** Capture TikTok/ads UTMs once per browser (first touch). */
export function captureAttribution(): Record<string, string> {
  try {
    const existingRaw = window.localStorage.getItem(ATTR_KEY);
    if (existingRaw) {
      const parsed = JSON.parse(existingRaw) as Record<string, string>;
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    /* continue */
  }

  const params = new URLSearchParams(window.location.search);
  const attr: Record<string, string> = {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_content: params.get("utm_content") || "",
    utm_term: params.get("utm_term") || "",
    ttclid: params.get("ttclid") || "",
    fbclid: params.get("fbclid") || "",
    referrer: document.referrer || "",
    device: detectDevice(),
    landing_path: window.location.pathname || "/",
    captured_at: new Date().toISOString(),
  };

  // Infer TikTok when in-app browser without UTM
  if (!attr.utm_source && /tiktok|musical_ly|bytedance/i.test(navigator.userAgent)) {
    attr.utm_source = "tiktok";
    attr.utm_medium = attr.utm_medium || "in_app";
  }

  try {
    window.localStorage.setItem(ATTR_KEY, JSON.stringify(attr));
  } catch {
    /* ignore */
  }
  return attr;
}

export function getAttribution(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(ATTR_KEY);
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch {
    /* ignore */
  }
  return captureAttribution();
}

/** Stable anonymous session id (survives reloads, TikTok in-app browser). */
export function getFunnelSessionId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;
    const id = randomId();
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return randomId();
  }
}

function alreadySent(step: FunnelStep): boolean {
  try {
    return window.sessionStorage.getItem(SENT_PREFIX + step) === "1";
  } catch {
    return false;
  }
}

function markSent(step: FunnelStep): void {
  try {
    window.sessionStorage.setItem(SENT_PREFIX + step, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Fire-and-forget first-party funnel event.
 * Deduped client-side per tab session + server-side per (session_id, step).
 */
export function trackFunnelStep(
  step: FunnelStep,
  meta?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  if (alreadySent(step)) return;
  markSent(step);

  const sessionId = getFunnelSessionId();
  const path = `${window.location.pathname}${window.location.search || ""}`.slice(
    0,
    500,
  );
  const attribution = getAttribution();

  void (async () => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;

      await fetch("/api/funnel/track", {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId,
          step,
          path,
          meta: {
            ...attribution,
            device: attribution.device || detectDevice(),
            ...(meta || {}),
          },
        }),
        keepalive: true,
      });
    } catch (err) {
      try {
        window.sessionStorage.removeItem(SENT_PREFIX + step);
      } catch {
        /* ignore */
      }
      if (import.meta.env.DEV) {
        console.warn("[funnel]", step, err);
      }
    }
  })();
}

/** Call once on app boot for TikTok/UTM capture before first track. */
export function initFunnelAttribution(): void {
  if (typeof window === "undefined") return;
  captureAttribution();
}
