import { useEffect, useState } from "react";
import {
  createLandingEditorialSlots,
  editorialPairAt,
  LANDING_EDITORIAL_ROTATE_MS,
  rotateEditorialPairIndices,
  type LandingEditorialSlot,
} from "@/lib/landing-v2-pairs";

export function LandingEditorialGrid() {
  const [slots, setSlots] = useState<LandingEditorialSlot[]>(() =>
    createLandingEditorialSlots(),
  );
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlots((previous) => {
        const nextIndices = rotateEditorialPairIndices(
          previous.map((slot) => slot.pairIndex),
        );
        return previous.map((slot, index) => ({
          ...slot,
          pairIndex: nextIndices[index] ?? slot.pairIndex,
        }));
      });
      setRevealed({});
      setGeneration((value) => value + 1);
    }, LANDING_EDITORIAL_ROTATE_MS);

    return () => window.clearInterval(timer);
  }, []);

  const toggleReveal = (position: string) => {
    setRevealed((prev) => ({ ...prev, [position]: !prev[position] }));
  };

  return (
    <div className="editorial-grid" data-generation={generation}>
      {slots.map((slot) => {
        const pair = editorialPairAt(slot.pairIndex);
        return (
          <figure
            key={slot.position}
            className={`editorial-figure ${slot.position} ${revealed[slot.position] ? "show-original" : ""}`}
          >
            <div className="editorial-figure__frame">
              <img
                key={`gen-${pair.id}-${generation}`}
                className="example-image example-generated editorial-photo-swap"
                src={pair.generated}
                alt={pair.generatedAlt}
                loading="eager"
                decoding="async"
              />
              <img
                key={`orig-${pair.id}-${generation}`}
                className="example-image example-original editorial-photo-swap"
                src={pair.original}
                alt={pair.originalAlt}
                loading="eager"
                decoding="async"
              />
            </div>
            <button
              type="button"
              className="reveal-original"
              aria-pressed={Boolean(revealed[slot.position])}
              onClick={() => toggleReveal(slot.position)}
            >
              {revealed[slot.position] ? "Voir le rendu" : "Voir l’original"}
            </button>
            <figcaption>
              <span>{slot.n}</span>
              <strong>{pair.label}</strong>
              <small>Créé avec LuxeFlexIA</small>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
