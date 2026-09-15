import { useEffect } from "react";
import { LandingImagePanel } from "@/components/landing/LandingImagePanel";
import "@/pages/create-page.css";
import "@/pages/generate-page.css";
import "./landing-studio-widget.css";

/** Hero image widget for non-admin visitors — same layout shell as admin preview, without mode tabs. */
export function LandingClientHeroWidget() {
  useEffect(() => {
    document.documentElement.classList.add(
      "luxeflexia-create-page",
      "luxeflexia-generate-page",
    );
    return () => {
      document.documentElement.classList.remove(
        "luxeflexia-create-page",
        "luxeflexia-generate-page",
      );
    };
  }, []);

  return (
    <div className="landing-studio-widget">
      <div className="landing-studio-widget__panel">
        <LandingImagePanel />
      </div>
    </div>
  );
}
