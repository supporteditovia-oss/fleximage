import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useCanLoadLandingAvif } from "@/hooks/use-can-load-landing-avif";
import {
  LANDING_MARQUEE_IMAGES,
  fetchLandingMarqueeImages,
  getMobileCompatibleLandingImages,
  type LandingMarqueeImage,
} from "@/lib/landing-marquee-images";

const MIN_FRAMES = 10;
const LOWER_ROW_IMAGE_IDS = new Set(["bb04deea-c7b1-46f0-a816-d3e8be84fec8"]);
const FRAME_CLASS =
  "relative h-[clamp(9rem,28vh,18rem)] aspect-[9/16] flex-shrink-0 rounded-lg border border-foreground/10 bg-white/45 shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden";
type ImageFetchPriority = "high" | "low" | "auto";

function padToMin<T>(items: T[], min: number): T[] {
  if (items.length === 0) return items;
  const result: T[] = [];
  while (result.length < min) {
    result.push(...items);
  }
  return result;
}

function splitFrameRows(items: LandingMarqueeImage[]) {
  const upper: LandingMarqueeImage[] = [];
  const lower: LandingMarqueeImage[] = [];

  for (const item of items) {
    if (LOWER_ROW_IMAGE_IDS.has(item.id)) {
      lower.push(item);
      continue;
    }

    if (upper.length <= lower.length) {
      upper.push(item);
    } else {
      lower.push(item);
    }
  }

  return { upper, lower };
}

function FrameCard({
  template,
  eager,
  fetchPriority,
}: {
  template: LandingMarqueeImage;
  eager: boolean;
  fetchPriority: ImageFetchPriority;
}) {
  return (
    <div className={FRAME_CLASS}>
      <img
        src={template.placeholder_url}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-90 blur-md"
      />
      <picture className="absolute inset-0 block h-full w-full">
        {template.webp_url ? (
          <source
            media="(max-width: 767px)"
            srcSet={template.webp_url}
            type="image/webp"
          />
        ) : null}
        <source srcSet={template.avif_url} type="image/avif" />
        {template.webp_url ? (
          <source srcSet={template.webp_url} type="image/webp" />
        ) : null}
        <img
          src={template.webp_url ?? template.avif_url}
          alt=""
          loading={eager ? "eager" : "lazy"}
          {...{ fetchpriority: fetchPriority }}
          decoding="async"
          className="h-full w-full object-cover opacity-95 saturate-100"
        />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-white/10" />
    </div>
  );
}

function PlaceholderFrame({ index }: { index: number }) {
  return (
    <div
      className={cn(
        FRAME_CLASS,
        "relative bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(0,0,0,0.03))]",
      )}
    >
      <div className="absolute inset-x-4 top-4 h-[38%] rounded-md border border-foreground/8 bg-white/35" />
      <div className="absolute inset-x-4 bottom-4 h-2 rounded-full bg-foreground/6" />
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            index % 2 === 0
              ? "linear-gradient(135deg, transparent 40%, rgba(0,0,0,0.15) 100%)"
              : "linear-gradient(225deg, transparent 40%, rgba(0,0,0,0.12) 100%)",
        }}
      />
    </div>
  );
}

function FrameRow({
  items,
  placeholders,
  duration,
  offsetY,
}: {
  items: LandingMarqueeImage[];
  placeholders: boolean;
  duration: number;
  offsetY: string;
}) {
  return (
    <div
      className="absolute left-0 right-0 flex overflow-hidden gap-4"
      style={{ top: offsetY }}
    >
      {[0, 1].map((track) => (
        <div
          key={track}
          className="flex min-w-full shrink-0 justify-around gap-4"
          aria-hidden={track === 1}
          style={{
            animation: `scroll ${duration}s linear infinite`,
          }}
        >
          {placeholders
            ? Array.from({ length: 8 }, (_, i) => (
                <PlaceholderFrame
                  key={`placeholder-${track}-${i}`}
                  index={i}
                />
              ))
            : items.map((template, i) => {
                const isPrimaryTrack = track === 0;
                const fetchPriority =
                  isPrimaryTrack && i < 4 ? "high" : "auto";

                return (
                  <FrameCard
                    key={`frame-${track}-${i}-${template.id}`}
                    template={template}
                    eager
                    fetchPriority={fetchPriority}
                  />
                );
              })}
        </div>
      ))}
    </div>
  );
}

export default function HeroBackgroundFrames() {
  const { data: templates } = useQuery<LandingMarqueeImage[]>({
    queryKey: ["landing-marquee-images"],
    queryFn: fetchLandingMarqueeImages,
    placeholderData: LANDING_MARQUEE_IMAGES,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const canLoadAvif = useCanLoadLandingAvif();
  const supportedTemplates = React.useMemo(() => {
    if (!templates) return templates;
    return canLoadAvif === false
      ? getMobileCompatibleLandingImages(templates)
      : templates;
  }, [canLoadAvif, templates]);

  const hasData = supportedTemplates && supportedTemplates.length > 0;
  const frames = hasData ? padToMin(supportedTemplates, MIN_FRAMES) : [];
  const { upper: row1, lower: row2 } = hasData
    ? splitFrameRows(frames)
    : { upper: [], lower: [] };

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-75 md:opacity-85 [mask-image:radial-gradient(ellipse_min(340px,88vw)_min(520px,52vh)_at_50%_56%,transparent_0%,transparent_38%,rgba(0,0,0,0.35)_52%,black_72%)]"
      >
        <FrameRow
          items={row1}
          placeholders={!hasData}
          duration={55}
          offsetY="calc(50% - 4.5rem)"
        />
        <FrameRow
          items={row2}
          placeholders={!hasData}
          duration={42}
          offsetY="calc(50% + 1.5rem)"
        />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_min(320px,84vw)_min(500px,50vh)_at_50%_56%,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.08)_38%,rgba(255,255,255,0.02)_58%,transparent_72%)] md:bg-[radial-gradient(ellipse_min(320px,84vw)_min(500px,50vh)_at_50%_56%,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.72)_38%,rgba(255,255,255,0.18)_58%,transparent_72%)]" />
    </div>
  );
}
