import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { initSnapPixel, trackSnapPageView, trackSnapStartCheckout } from "@/lib/snap-pixel";

/**
 * Initializes Snap Pixel and fires PAGE_VIEW on route changes.
 * Detects the credits paywall CTA class without editing PaywallOverlay.
 */
export function SnapPixelProvider() {
  const [location] = useLocation();
  const pathname = location.split("?")[0] || location;
  const lastPath = useRef<string | null>(null);
  const paywallSeen = useRef(false);

  useEffect(() => {
    initSnapPixel();
  }, []);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackSnapPageView();
    paywallSeen.current = false;
  }, [pathname]);

  useEffect(() => {
    const checkPaywall = () => {
      if (paywallSeen.current) return;
      if (document.querySelector(".paywall-credits-cta-border")) {
        paywallSeen.current = true;
        trackSnapStartCheckout();
      }
    };

    const observer = new MutationObserver(() => checkPaywall());
    observer.observe(document.body, { childList: true, subtree: true });
    checkPaywall();
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
