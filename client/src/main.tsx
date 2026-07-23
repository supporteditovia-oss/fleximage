import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { preloadLandingMarqueeImages } from "./lib/landing-marquee-images";
import { initFunnelAttribution } from "./lib/funnel-tracker";

const container = document.getElementById("root");
if (!container) throw new Error("Failed to find the root element");

document.getElementById("seo-fallback")?.remove();
preloadLandingMarqueeImages();
initFunnelAttribution();

window.addEventListener("error", (event) => {
  try {
    sessionStorage.setItem(
      "luxeflexia:last-window-error",
      JSON.stringify({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        href: window.location.href,
        at: new Date().toISOString(),
      }),
    );
  } catch {
    /* ignore */
  }
});

window.addEventListener("unhandledrejection", (event) => {
  try {
    const reason = event.reason;
    sessionStorage.setItem(
      "luxeflexia:last-unhandled-rejection",
      JSON.stringify({
        message:
          reason instanceof Error
            ? reason.message
            : typeof reason === "string"
              ? reason
              : String(reason),
        href: window.location.href,
        at: new Date().toISOString(),
      }),
    );
  } catch {
    /* ignore */
  }
});

createRoot(container).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
