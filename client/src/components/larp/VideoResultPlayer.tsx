import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface VideoResultPlayerProps {
  src: string;
  /** Optional still (e.g. reference image) shown until the first video frame is decoded */
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
}

/**
 * Shows the first decoded frame before play (not a blank area + generic play icon).
 * Uses poster when provided, plus a tiny seek after metadata loads.
 */
export function VideoResultPlayer({
  src,
  poster,
  className,
  autoPlay = false,
  muted = false,
  controls = true,
}: VideoResultPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const primedRef = useRef(false);

  useEffect(() => {
    primedRef.current = false;
  }, [src]);

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
      }
    } catch {
      primedRef.current = false;
    }
  }, [autoPlay]);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      controls={controls}
      playsInline
      preload="auto"
      muted={muted || autoPlay}
      autoPlay={autoPlay}
      className={cn("absolute inset-0 h-full w-full object-contain", className)}
      onLoadedMetadata={primeFirstFrame}
      onLoadedData={primeFirstFrame}
    />
  );
}
