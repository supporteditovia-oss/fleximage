import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoHistoryCardPreviewProps {
  posterUrl?: string;
  className?: string;
}

/**
 * Grid thumbnail for history — no <video> element.
 * iOS Safari keeps <video> blank until play; seeking the first frame often
 * fails without CORS and can hide the poster attribute.
 */
export function VideoHistoryCardPreview({
  posterUrl,
  className,
}: VideoHistoryCardPreviewProps) {
  return (
    <div className={cn("absolute inset-0", className)}>
      {posterUrl ? (
        <img
          src={posterUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-muted to-muted-foreground/25" />
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm">
          <Play className="h-5 w-5 fill-current pl-0.5" aria-hidden />
        </span>
      </div>
    </div>
  );
}
