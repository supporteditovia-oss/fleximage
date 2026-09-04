/** Scroll interne de l’app (évite les bugs iOS avec position:fixed + body scroll). */
export const APP_SCROLL_ID = "luxeflexia-app-scroll";

export function getAppScrollEl(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(APP_SCROLL_ID);
}

export function getAppScrollTop(): number {
  return getAppScrollEl()?.scrollTop ?? window.scrollY;
}

export function scrollAppTo(top: number, behavior: ScrollBehavior = "auto") {
  const el = getAppScrollEl();
  if (el) {
    el.scrollTo({ top, behavior });
    return;
  }
  window.scrollTo({ top, behavior });
}

export function scrollAppToTop(behavior: ScrollBehavior = "smooth") {
  scrollAppTo(0, behavior);
}
