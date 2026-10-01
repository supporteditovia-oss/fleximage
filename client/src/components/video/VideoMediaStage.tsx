import { ImageIcon, Loader2, Upload, Video } from "lucide-react";
import type { RefObject, ReactNode } from "react";

type VideoMediaStageProps = {
  kind: "image" | "video";
  busy?: boolean;
  aspect?: "9:16" | "16:9";
  mediaUrl?: string | null;
  videoRef?: RefObject<HTMLVideoElement | null>;
  posterUrl?: string | null;
  meta?: string;
  onPick: () => void;
  children?: ReactNode;
};

export function VideoMediaStage({
  kind,
  busy,
  aspect = "9:16",
  mediaUrl,
  videoRef,
  posterUrl,
  meta,
  onPick,
  children,
}: VideoMediaStageProps) {
  const hasMedia = Boolean(mediaUrl);
  const aspectClass = aspect === "16:9" ? "is-landscape" : "is-portrait";

  return (
    <div
      className={`via-media-stage ${aspectClass} ${hasMedia ? "has-media" : ""}`}
    >
      <div className="via-media-stage__frame" aria-hidden={!hasMedia} />
      <button
        type="button"
        className="via-media-stage__hit"
        onClick={onPick}
        disabled={busy}
        aria-label={hasMedia ? "Remplacer le média" : "Importer un média"}
      >
        {busy ? (
          <span className="via-media-stage__empty">
            <Loader2 className="h-7 w-7 animate-spin text-[var(--lx-gold)]" />
            <span className="via-media-stage__title">Import…</span>
          </span>
        ) : hasMedia && kind === "image" ? (
          <>
            <img src={mediaUrl!} alt="" className="via-media-stage__img" />
            <span className="via-media-stage__replace">Changer</span>
          </>
        ) : hasMedia && kind === "video" ? (
          <>
            <video
              ref={videoRef}
              src={mediaUrl!}
              poster={posterUrl ?? undefined}
              className="via-media-stage__video"
              controls
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="via-media-stage__replace">Changer</span>
          </>
        ) : (
          <span className="via-media-stage__empty">
            {kind === "image" ? (
              <ImageIcon className="via-media-stage__icon" strokeWidth={1.25} />
            ) : (
              <Video className="via-media-stage__icon" strokeWidth={1.25} />
            )}
            <span className="via-media-stage__title">
              {kind === "image" ? "Ta photo" : "Ta vidéo"}
            </span>
            {meta ? (
              <span className="via-media-stage__meta">{meta}</span>
            ) : null}
            <span className="via-media-stage__cta">
              <Upload className="h-3.5 w-3.5" aria-hidden />
              Importer
            </span>
          </span>
        )}
      </button>
      {children}
    </div>
  );
}
