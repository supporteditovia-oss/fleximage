import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LANDING_VIDEO_SHOWCASE_ASSETS,
  type LandingVideoShowcaseSlot,
  type LandingVideoWorkflow,
} from "@/lib/landing-video-showcase";

function ShowcaseMedia({
  slot,
  motionIfNoVideo,
}: {
  slot: LandingVideoShowcaseSlot;
  motionIfNoVideo?: boolean;
}) {
  const [videoFailed, setVideoFailed] = useState(false);
  const useVideo = Boolean(slot.video) && !videoFailed;
  const motionPlaceholder = motionIfNoVideo && !useVideo;

  return (
    <div
      className={`video-showcase-media ${motionPlaceholder ? "video-showcase-media--motion" : ""}`}
    >
      {useVideo ? (
        <video
          src={slot.video!}
          poster={slot.poster}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-label={slot.alt}
          onError={() => setVideoFailed(true)}
        />
      ) : (
        <>
          <img src={slot.poster} alt={slot.alt} loading="lazy" />
          <div className="video-showcase-media__overlay" aria-hidden>
            {motionPlaceholder ? (
              <>
                <span className="video-showcase-media__play">▶</span>
                <span className="video-showcase-media__pulse" />
              </>
            ) : (
              <span className="video-showcase-media__tag">{slot.staticTag ?? "Photo"}</span>
            )}
          </div>
        </>
      )}
      <span className="video-showcase-media__label">{slot.label}</span>
    </div>
  );
}

export function LandingVideoShowcase() {
  const { t } = useTranslation();
  const [active, setActive] = useState<LandingVideoWorkflow>("i2v");

  const showcases = useMemo(
    () =>
      LANDING_VIDEO_SHOWCASE_ASSETS.map((item) => ({
        id: item.id,
        index: item.index,
        title: t(`landing:video.${item.prefix}.title`),
        tech: t(`landing:video.${item.prefix}.tech`),
        description: t(`landing:video.${item.prefix}.description`),
        before: {
          label: t(`landing:video.${item.prefix}.beforeLabel`),
          poster: item.beforePoster,
          video: item.beforeVideo,
          alt: t(`landing:video.${item.prefix}.beforeAlt`),
          staticTag: t(`landing:video.${item.prefix}.staticTag`),
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

  const config = showcases.find((item) => item.id === active)!;

  return (
    <div className="video-showcase">
      <div
        className="video-cinema-lanes video-showcase__tabs"
        role="tablist"
        aria-label={t("landing:video.tabsAria")}
      >
        {showcases.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active === item.id}
            className={`video-cinema-lane video-showcase__tab ${active === item.id ? "video-cinema-lane--accent is-active" : ""}`}
            onClick={() => setActive(item.id)}
          >
            <span className="video-cinema-lane__index">{item.index}</span>
            <div className="video-cinema-lane__body">
              <h3>{item.title}</h3>
              <p className="video-cinema-lane__tech">{item.tech}</p>
              <p className="video-cinema-lane__desc">{item.description}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="video-showcase__compare" key={active} role="tabpanel">
        <ShowcaseMedia slot={config.before} />
        <div className="video-showcase__arrow" aria-hidden>
          →
        </div>
        <ShowcaseMedia slot={config.after} motionIfNoVideo />
      </div>
      <p className="video-showcase__hint">{t("landing:video.hint")}</p>
    </div>
  );
}
