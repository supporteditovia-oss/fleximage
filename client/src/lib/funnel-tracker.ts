import { supabase } from "@/lib/supabase";

export const FUNNEL_STEPS = [
  "landing",
  "signup",
  "upload",
  "generate",
  "preview",
  "paywall",
  "subscribed",
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

const STORAGE_KEY = "luxeflexia:funnel_session_id";
const SENT_PREFIX = "luxeflexia:funnel_sent:";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `fs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
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
          meta: meta || {},
        }),
        keepalive: true,
      });
    } catch (err) {
      // Allow retry later in the same tab if the request failed.
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
