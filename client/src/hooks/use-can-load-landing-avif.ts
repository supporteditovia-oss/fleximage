import * as React from "react";
import { canaryLandingAvifUrl } from "@/lib/landing-marquee-images";

export function useCanLoadLandingAvif() {
  const [canLoadAvif, setCanLoadAvif] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const avifUrl = canaryLandingAvifUrl();
    if (!avifUrl) {
      setCanLoadAvif(false);
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (!cancelled) setCanLoadAvif(true);
    };
    image.onerror = () => {
      if (!cancelled) setCanLoadAvif(false);
    };
    image.src = avifUrl;

    return () => {
      cancelled = true;
    };
  }, []);

  return canLoadAvif;
}
