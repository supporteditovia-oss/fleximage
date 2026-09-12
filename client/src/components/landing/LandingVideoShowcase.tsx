import { useState } from "react";
import {
  LANDING_VIDEO_SHOWCASES,
  type LandingVideoShowcaseSlot,
  type LandingVideoWorkflow,
} from "@/lib/landing-video-showcase";

function ShowcaseMedia({ slot, motion }: { slot: LandingVideoShowcaseSlot; motion?: boolean }) {
  return (
    <div className={`video-showcase-media ${motion ? "video-showcase-media--motion" : ""}`}>
      {slot.video ? (
        <video
          src={slot.video}
          poster={slot.poster}
          autoPlay
          loop
          muted
          playsInline
          aria-label={slot.alt}
        />
      ) : (
        <>
          <img src={slot.poster} alt={slot.alt} loading="lazy" />
          <div className="video-showcase-media__overlay" aria-hidden>
            {motion ? (
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
  const [active, setActive] = useState<LandingVideoWorkflow>("i2v");
  const config = LANDING_VIDEO_SHOWCASES.find((item) => item.id === active)!;

  return (
    <div className="video-showcase">
      <div className="video-cinema-lanes video-showcase__tabs" role="tablist" aria-label="Ateliers vidéo">
        {LANDING_VIDEO_SHOWCASES.map((item) => (
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
        <ShowcaseMedia slot={config.after} motion />
      </div>
      <p className="video-showcase__hint">
        Exemple visuel — vos clips vidéo pourront remplacer ces aperçus dès qu’ils seront prêts.
      </p>
    </div>
  );
}
