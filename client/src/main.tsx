import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { preloadLandingMarqueeImages } from "./lib/landing-marquee-images";

const container = document.getElementById("root");
if (!container) throw new Error("Failed to find the root element");

preloadLandingMarqueeImages();

createRoot(container).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
