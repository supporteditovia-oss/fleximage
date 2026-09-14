import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  createLandingEditorialSlots,
  editorialPairAt,
  LANDING_EDITORIAL_ROTATE_MS,
  rotateEditorialPairIndices,
  type LandingEditorialSlot,
} from "@/lib/landing-v2-pairs";

export function LandingEditorialGrid() {
  const { t } = useTranslation();
  const [slots, setSlots] = useState<LandingEditorialSlot[]>(() =>
    createLandingEditorialSlots(),
  );
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
    <div className="editorial-showcase">
      <div className="editorial-showcase__glow" aria-hidden="true" />
      <div className="editorial-showcase__fade editorial-showcase__fade--left" aria-hidden="true" />
      <div className="editorial-showcase__fade editorial-showcase__fade--right" aria-hidden="true" />
      <div className="editorial-grid" data-generation={generation}>
        {slots.map((slot) => {
          const pair = editorialPairAt(slot.pairIndex);
          const isOriginal = Boolean(showOriginal[slot.position]);
          const pairKey = `landing:editorial.pairs.${pair.id}` as const;

          return (
            <figure
              key={slot.position}
              className={`editorial-figure ${slot.position}`}
            >
              <div className="editorial-figure__mat">
                <div className="editorial-figure__frame">
                  <img
                    key={`${pair.id}-${generation}-${isOriginal ? "before" : "after"}`}
                    className="editorial-figure__photo editorial-photo-swap"
                    src={isOriginal ? pair.original : pair.generated}
                    alt={
                      isOriginal
                        ? t(`${pairKey}.originalAlt`)
                        : t(`${pairKey}.generatedAlt`)
                    }
                    loading="eager"
                    decoding="async"
                  />
                  <div
                    key={`sheen-${generation}-${isOriginal ? "before" : "after"}`}
                    className="editorial-figure__sheen"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <button
                type="button"
                className="reveal-original"
                aria-pressed={isOriginal}
                onClick={() => toggleOriginal(slot.position)}
              >
                {isOriginal
                  ? t("landing:editorial.showRender")
                  : t("landing:editorial.showOriginal")}
              </button>
              <figcaption>
                <span>{slot.n}</span>
                <strong>{t(`${pairKey}.label`)}</strong>
                <small>{t("landing:editorial.createdWith")}</small>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
