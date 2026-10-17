import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import {
  LANDING_VIDEO_SHOWCASE_ASSETS,
  type LandingVideoShowcaseSlot,
} from "@/lib/landing-video-showcase";

function ShowcaseMedia({
  slot,
  videoRef,
}: {
  slot: LandingVideoShowcaseSlot;
  videoRef?: RefObject<HTMLVideoElement>;
}) {
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
          ref={videoRef}
        />
      ) : (
        <>
          <img src={slot.poster} alt={slot.alt} loading="lazy" />
          <div className="video-showcase-media__overlay" aria-hidden>
            <span className="video-showcase-media__tag">
              {slot.staticTag ?? "Photo"}
            </span>
          </div>
        </>
      )}
      <span className="video-showcase-media__label">{slot.label}</span>
    </div>
  );
}

type LandingVideoShowcaseWorkshop = {
  id: string;
  workshopLabel: string;
  title: string;
  tech: string;
  description: string;
  before: LandingVideoShowcaseSlot;
  after: LandingVideoShowcaseSlot;
};

function ShowcaseWorkshop({
  item,
}: {
  item: LandingVideoShowcaseWorkshop;
}) {
  const beforeVideo = useRef<HTMLVideoElement>(null);
  const afterVideo = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!item.before.video || !item.after.video) return;

    let frame = 0;
    const synchronizePlayback = () => {
      const source = beforeVideo.current;
      const result = afterVideo.current;

      if (
        source &&
        result &&
        !source.paused &&
        !result.paused &&
        Number.isFinite(source.duration) &&
        source.duration > 0 &&
        Number.isFinite(result.duration) &&
        result.duration > 0
      ) {
        const progress = (source.currentTime % source.duration) / source.duration;
        const targetTime = progress * result.duration;
        if (Math.abs(result.currentTime - targetTime) > 0.12) {
          result.currentTime = targetTime;
        }
      }

      frame = requestAnimationFrame(synchronizePlayback);
    };

    frame = requestAnimationFrame(synchronizePlayback);
    return () => cancelAnimationFrame(frame);
  }, [item.before.video, item.after.video]);

  return (
    <section
      className="video-showcase__workshop"
      aria-labelledby={`video-showcase-${item.id}-title`}
    >
      <header className="video-showcase__workshop-heading">
        <span className="video-showcase__workshop-index">
          {item.workshopLabel}
        </span>
        <h3 id={`video-showcase-${item.id}-title`}>{item.title}</h3>
        <p className="video-cinema-lane__tech">{item.tech}</p>
        <p className="video-cinema-lane__desc">{item.description}</p>
      </header>
      <div className="video-showcase__compare">
        <ShowcaseMedia slot={item.before} videoRef={beforeVideo} />
        <div className="video-showcase__arrow" aria-hidden>
          →
        </div>
        <ShowcaseMedia slot={item.after} videoRef={afterVideo} />
      </div>
    </section>
  );
}

export function LandingVideoShowcase() {
  const { t } = useTranslation();

  const showcases = useMemo(
    () =>
      LANDING_VIDEO_SHOWCASE_ASSETS.map((item) => ({
        id: item.id,
        workshopLabel: t("landing:video.workshopLabel", {
          index: item.index,
        }),
        title: t(`landing:video.${item.prefix}.title`),
        tech: t(`landing:video.${item.prefix}.tech`),
        description: t(`landing:video.${item.prefix}.description`),
        before: {
          label: t(`landing:video.${item.prefix}.beforeLabel`),
          poster: item.beforePoster,
          video: item.beforeVideo,
          alt: t(`landing:video.${item.prefix}.beforeAlt`),
          ...(item.beforeStaticTag
            ? {
                staticTag: t(
                  `landing:video.${item.prefix}.staticTag`,
                ),
              }
            : {}),
        },
        after: {
          label: t(`landing:video.${item.prefix}.afterLabel`),
          poster: item.afterPoster,
          video: item.afterVideo,
          alt: t(`landing:video.${item.prefix}.afterAlt`),
        },
      })),
    [t],
  );

  return (
    <div className="video-showcase">
      {showcases.map((item) => (
        <ShowcaseWorkshop item={item} key={item.id} />
      ))}
    </div>
  );
}
