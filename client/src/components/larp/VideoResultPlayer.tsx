import { Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface VideoResultPlayerProps {
  src: string;
  /** Optional still (e.g. reference image) shown until the first video frame is decoded */
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  objectFit?: "contain" | "cover";
}

/**
 * Shows a still before play. Keeps a poster <img> visible until the video
 * frame is actually painted — Safari often leaves <video> blank and seeking
 * without CORS clears the native poster.
 */
export function VideoResultPlayer({
  src,
  poster,
  className,
  autoPlay = false,
  muted = false,
  controls = true,
  objectFit = "contain",
}: VideoResultPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const primedRef = useRef(false);
  const [frameVisible, setFrameVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    primedRef.current = false;
    setFrameVisible(false);
    setIsPlaying(false);
  }, [src, poster]);

  const primeFirstFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || primedRef.current) return;

    try {
      if (video.readyState < HTMLMediaElement.HAVE_METADATA) return;
      primedRef.current = true;
      if (!autoPlay) {
        video.pause();
      }
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const target = duration > 0 ? Math.min(0.04, duration * 0.001) : 0.001;
      if (Math.abs(video.currentTime - target) > 0.0005) {
        video.currentTime = target;
      } else {
        setFrameVisible(true);
      }
    } catch {
      primedRef.current = false;
    }
  }, [autoPlay]);

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
      return;
    }

    video.pause();
  }, []);

  const showPosterLayer = Boolean(poster) && !isPlaying && !frameVisible;
  const objectClass =
    objectFit === "cover" ? "object-cover" : "object-contain";

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
      {poster && (
        <img
          src={poster}
          alt=""
          aria-hidden
          className={cn(
            "absolute inset-0 h-full w-full rounded-[inherit] object-cover transition-opacity duration-200",
            showPosterLayer ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        />
      )}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls={controls}
        playsInline
        preload="metadata"
        muted={muted || autoPlay}
        autoPlay={autoPlay}
        className={cn(
          "absolute inset-0 h-full w-full rounded-[inherit] transition-opacity duration-200",
          objectClass,
          showPosterLayer ? "opacity-0" : "opacity-100",
          className,
        )}
        onLoadedMetadata={primeFirstFrame}
        onLoadedData={primeFirstFrame}
        onSeeked={() => setFrameVisible(true)}
        onPlay={() => {
          setIsPlaying(true);
          setFrameVisible(true);
        }}
        onPause={() => setIsPlaying(false)}
      />
      {!controls && !isPlaying ? (
        <button
          type="button"
          onClick={togglePlayback}
          className="absolute left-1/2 top-1/2 z-20 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/55 active:scale-95"
          aria-label="Play video"
        >
          <Play className="ml-0.5 h-7 w-7 fill-current" />
        </button>
      ) : null}
      {!controls && isPlaying ? (
        <button
          type="button"
          onClick={togglePlayback}
          className="absolute inset-0 z-10 cursor-default"
          aria-label="Pause video"
        />
      ) : null}
    </div>
  );
}
