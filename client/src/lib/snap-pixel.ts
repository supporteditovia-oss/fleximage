declare global {
  interface Window {
    snaptr?: (...args: unknown[]) => void;
    __snapPixelReady?: boolean;
  }
}

const PIXEL_ID = import.meta.env.VITE_SNAP_PIXEL_ID as string | undefined;

type SnapEvent =
  | "PAGE_VIEW"
  | "SIGN_UP"
  | "START_CHECKOUT"
  | "PURCHASE"
  | "VIEW_CONTENT";

function canTrack(): boolean {
  return Boolean(
    typeof window !== "undefined" &&
      PIXEL_ID &&
      PIXEL_ID.length > 0 &&
      !PIXEL_ID.includes("%VITE_") &&
      typeof window.snaptr === "function",
  );
}

/** Load Snap Pixel base snippet once (also injected in index.html when ID is set). */
export function initSnapPixel(): void {
  if (typeof window === "undefined" || !PIXEL_ID || PIXEL_ID.includes("%VITE_")) {
    return;
  }
  if (window.__snapPixelReady) return;

  if (!window.snaptr) {
    const snaptr = function (...args: unknown[]) {
      (snaptr as { queue?: unknown[][] }).queue =
        (snaptr as { queue?: unknown[][] }).queue || [];
      (snaptr as { queue?: unknown[][] }).queue!.push(args);
    } as typeof window.snaptr & { queue?: unknown[][] };
    window.snaptr = snaptr;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://sc-static.net/scevent.min.js";
    document.head.appendChild(script);
  }

  window.snaptr!("init", PIXEL_ID, {});
  window.__snapPixelReady = true;
}

export function trackSnapEvent(
  event: SnapEvent,
  data?: Record<string, unknown>,
): void {
  if (!canTrack()) return;
  try {
    if (data && Object.keys(data).length > 0) {
      window.snaptr!("track", event, data);
    } else {
      window.snaptr!("track", event);
    }
  } catch {
    // ignore tracking failures
  }
}

export function trackSnapPageView(): void {
  trackSnapEvent("PAGE_VIEW");
}

export function trackSnapSignUp(): void {
  trackSnapEvent("SIGN_UP", { sign_up_method: "email" });
}

export function trackSnapSignUpGoogle(): void {
  trackSnapEvent("SIGN_UP", { sign_up_method: "google" });
}

let lastStartCheckoutAt = 0;

/** Deduped START_CHECKOUT (paywall / checkout initiation). */
export function trackSnapStartCheckout(): void {
  const now = Date.now();
  if (now - lastStartCheckoutAt < 4000) return;
  lastStartCheckoutAt = now;
  trackSnapEvent("START_CHECKOUT");
}

export function getSnapPixelId(): string | undefined {
  if (!PIXEL_ID || PIXEL_ID.includes("%VITE_")) return undefined;
  return PIXEL_ID;
}
