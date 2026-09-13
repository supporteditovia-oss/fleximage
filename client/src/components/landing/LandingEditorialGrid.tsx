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
  /** true = affiche la photo avant (originale) ; false = rendu IA (après). */
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
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
      setShowOriginal({});
      setGeneration((value) => value + 1);
    }, LANDING_EDITORIAL_ROTATE_MS);

    return () => window.clearInterval(timer);
  }, []);

  const toggleOriginal = (position: string) => {
    setShowOriginal((prev) => ({ ...prev, [position]: !prev[position] }));
  };

  return (
    <div className="editorial-grid" data-generation={generation}>
      {slots.map((slot) => {
        const pair = editorialPairAt(slot.pairIndex);
        const isOriginal = Boolean(showOriginal[slot.position]);
        const activeSrc = isOriginal ? pair.original : pair.generated;
        const activeAlt = isOriginal ? pair.originalAlt : pair.generatedAlt;

        return (
          <figure
            key={slot.position}
            className={`editorial-figure ${slot.position}`}
          >
            <div className="editorial-figure__frame">
              <img
                key={`${pair.id}-${generation}-${isOriginal ? "before" : "after"}`}
                className="editorial-figure__photo editorial-photo-swap"
                src={activeSrc}
                alt={activeAlt}
                loading="eager"
                decoding="async"
              />
            </div>
            <button
              type="button"
              className="reveal-original"
              aria-pressed={isOriginal}
              onClick={() => toggleOriginal(slot.position)}
            >
              {isOriginal ? "Voir le rendu" : "Voir l’original"}
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
