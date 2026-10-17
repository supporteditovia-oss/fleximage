import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LANDING_VIDEO_SHOWCASES } from "@/lib/landing-video-showcase";
import type {
  LandingVideoShowcaseSlot,
} from "@/lib/landing-video-showcase";

function ShowcaseMedia({ slot }: { slot: LandingVideoShowcaseSlot }) {
  return (
    <div className="video-showcase-media">
      {slot.video ? (
        <video
          src={slot.video}
          poster={slot.poster}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-label={slot.alt}
        />
      ) : (
        <>
          <img src={slot.poster} alt={slot.alt} loading="lazy" />
          <div className="video-showcase-media__overlay" aria-hidden>
            <span className="video-showcase-media__tag">{slot.staticTag ?? "Photo"}</span>
          </div>
        </>
      )}
      <span className="video-showcase-media__label">{slot.label}</span>
    </div>
  );
}

export function LandingVideoShowcase() {
  const { t } = useTranslation();

  const showcases = useMemo(
    () =>
      LANDING_VIDEO_SHOWCASES.map((item) => ({
        id: item.id,
        index: item.index,
        title: t(`landing:video.${item.id}.title`),
        tech: t(`landing:video.${item.id}.tech`),
        description: t(`landing:video.${item.id}.description`),
        before: {
          ...item.before,
          label: t(`landing:video.${item.id}.beforeLabel`),
          alt: t(`landing:video.${item.id}.beforeAlt`),
          ...(item.before.staticTag
            ? { staticTag: t(`landing:video.${item.id}.staticTag`) }
            : {}),
        },
        after: {
          ...item.after,
          label: t(`landing:video.${item.id}.afterLabel`),
          alt: t(`landing:video.${item.id}.afterAlt`),
        },
      })),
    [t],
  );

  return (
    <div className="video-showcase">
      {showcases.map((item) => (
        <section
          className="video-showcase__workshop"
          key={item.id}
          aria-labelledby={`video-showcase-${item.id}-title`}
        >
          <header className="video-showcase__workshop-heading">
            <span className="video-showcase__workshop-index">
              {t("landing:video.workshopLabel", { index: item.index })}
            </span>
            <h3 id={`video-showcase-${item.id}-title`}>{item.title}</h3>
            <p className="video-cinema-lane__tech">{item.tech}</p>
            <p className="video-cinema-lane__desc">{item.description}</p>
          </header>
          <div className="video-showcase__compare">
            <ShowcaseMedia slot={item.before} />
            <div className="video-showcase__arrow" aria-hidden>
              →
            </div>
            <ShowcaseMedia slot={item.after} />
          </div>
        </section>
      ))}
    </div>
  );
}
