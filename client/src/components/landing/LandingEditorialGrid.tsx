import { useEffect, useRef, useState } from "react";
import {
  advanceEditorialPoolIndex,
  createLandingEditorialSlots,
  editorialTileAt,
  LANDING_EDITORIAL_ROTATE_MS,
  type LandingEditorialSlot,
} from "@/lib/landing-v2-pairs";

export function LandingEditorialGrid() {
  const [slots, setSlots] = useState<LandingEditorialSlot[]>(() =>
    createLandingEditorialSlots(),
  );
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const slotCursorRef = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const slotIndex = slotCursorRef.current;
      slotCursorRef.current = (slotCursorRef.current + 1) % slots.length;

      setSlots((previous) => {
        const rotatedPosition = previous[slotIndex]?.position;
        if (rotatedPosition) {
          setRevealed((revealed) => {
            if (!revealed[rotatedPosition]) return revealed;
            const next = { ...revealed };
            delete next[rotatedPosition];
            return next;
          });
        }

        return previous.map((slot, index) =>
          index === slotIndex
            ? {
                ...slot,
                poolIndex: advanceEditorialPoolIndex(slot.poolIndex),
              }
            : slot,
        );
      });
    }, LANDING_EDITORIAL_ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [slots.length]);

  const toggleReveal = (position: string) => {
    setRevealed((prev) => ({ ...prev, [position]: !prev[position] }));
  };

  return (
    <div className="editorial-grid">
      {slots.map((slot) => {
        const tile = editorialTileAt(slot.poolIndex);
        return (
          <figure
            key={slot.position}
            className={`editorial-figure ${slot.position} ${revealed[slot.position] ? "show-original" : ""}`}
          >
            <img
              key={`gen-${tile.id}-${slot.poolIndex}`}
              className="example-image example-generated editorial-photo-swap"
              src={tile.generated}
              alt={tile.generatedAlt}
              loading="eager"
              decoding="async"
            />
            <img
              key={`orig-${tile.id}-${slot.poolIndex}`}
              className="example-image example-original editorial-photo-swap"
              src={tile.original}
              alt="Photo originale avant transformation"
              loading="eager"
              decoding="async"
            />
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
              <strong>{tile.label}</strong>
              <small>Créé avec LuxeFlexIA</small>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
