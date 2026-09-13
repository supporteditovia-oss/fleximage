import { useCallback, useEffect, useRef, useState } from "react";
import {
  LANDING_EDITORIAL_ROTATE_MS,
  pickLandingEditorialGrid,
  type LandingEditorialGridItem,
} from "@/lib/landing-v2-pairs";

export function LandingEditorialGrid() {
  const [grid, setGrid] = useState<LandingEditorialGridItem[]>(() =>
    pickLandingEditorialGrid(4),
  );
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [swapGeneration, setSwapGeneration] = useState(0);
  const previousIdsRef = useRef<string[]>([]);

  const reshuffle = useCallback(() => {
    setGrid(pickLandingEditorialGrid(4, previousIdsRef.current));
    setRevealed({});
    setSwapGeneration((value) => value + 1);
  }, []);

  useEffect(() => {
    previousIdsRef.current = grid.map((item) => item.id);
  }, [grid]);

  useEffect(() => {
    const timer = window.setInterval(reshuffle, LANDING_EDITORIAL_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [reshuffle]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) reshuffle();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [reshuffle]);

  const toggleReveal = (slotKey: string) => {
    setRevealed((prev) => ({ ...prev, [slotKey]: !prev[slotKey] }));
  };

  return (
    <div className="editorial-grid" data-swap={swapGeneration}>
      {grid.map((item) => {
        const slotKey = `${item.position}-${item.id}`;
        return (
          <figure
            key={`${slotKey}-${swapGeneration}`}
            className={`editorial-figure ${item.position} editorial-figure--swap ${revealed[slotKey] ? "show-original" : ""}`}
          >
            <img
              className="example-image example-generated"
              src={item.generated}
              alt={item.generatedAlt}
              loading="lazy"
            />
            <img
              className="example-image example-original"
              src={item.original}
              alt="Photo originale avant transformation"
              loading="lazy"
            />
            <button
              type="button"
              className="reveal-original"
              aria-pressed={Boolean(revealed[slotKey])}
              onClick={() => toggleReveal(slotKey)}
            >
              {revealed[slotKey] ? "Voir le rendu" : "Voir l’original"}
            </button>
            <figcaption>
              <span>{item.n}</span>
              <strong>{item.label}</strong>
              <small>Créé avec LuxeFlexIA</small>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
