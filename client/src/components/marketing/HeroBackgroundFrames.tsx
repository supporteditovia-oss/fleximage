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
import { buildExclusiveHeroRows } from "@/lib/hero-marquee-pools";

/** Villa / piscine — fond doux derrière le marquee */
const HERO_BG_URL =
  "https://images.unsplash.com/photo-1758192838598-a1de4da5dcaf?auto=format&fit=crop&w=1920&q=80";

const CARD_SIZES = [
  "h-[180px]",
  "h-[200px]",
  "h-[220px]",
  "h-[190px]",
  "h-[210px]",
  "h-[185px]",
  "h-[205px]",
] as const;

const LOOP_COPIES = 3;
const ROW_HEIGHT_PX = 220;
const ROW_GAP_PX = 40;

function repeatList<T>(items: T[], times: number): T[] {
  const result: T[] = [];
  for (let i = 0; i < times; i += 1) {
    result.push(...items);
  }
  return result;
}

function MarqueeCard({
  image,
  sizeClass,
}: {
  image: LandingMarqueeImage;
  sizeClass: string;
}) {
  return (
    <div
      className={cn(
        "lx-pov-card relative aspect-[9/16] shrink-0 overflow-hidden rounded-[12px] border border-black/5 bg-white/30",
        sizeClass,
      )}
      style={{
        boxShadow:
          "0 10px 28px rgba(18, 16, 14, 0.12), 0 2px 8px rgba(18, 16, 14, 0.06)",
      }}
    >
      <img
        src={image.placeholder_url}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-90 blur-md"
      />
      <picture className="absolute inset-0 block h-full w-full">
        {image.webp_url ? (
          <source
            media="(max-width: 767px)"
            srcSet={image.webp_url}
            type="image/webp"
          />
        ) : null}
        {image.avif_url ? (
          <source srcSet={image.avif_url} type="image/avif" />
        ) : null}
        {image.webp_url ? (
          <source srcSet={image.webp_url} type="image/webp" />
        ) : null}
        <img
          src={image.webp_url ?? image.avif_url}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </picture>
    </div>
  );
}

function MarqueeRow({
  images,
  direction,
  duration,
  top,
  rowClassName,
}: {
  images: LandingMarqueeImage[];
  direction: "left" | "right";
  duration: number;
  top: string;
  rowClassName?: string;
}) {
  const loopImages = React.useMemo(
    () => repeatList(images, LOOP_COPIES),
    [images],
  );

  return (
    <div
      className={cn(
        "lx-hero-marquee-row absolute left-0 right-0 overflow-hidden",
        rowClassName,
      )}
      style={{ top, height: "var(--lx-marquee-row-h, 220px)" }}
    >
      <div
        className={cn(
          "lx-hero-marquee-track flex h-full w-max items-end gap-4 px-3",
          direction === "left" ? "lx-marquee-track" : "lx-marquee-track-reverse",
        )}
        style={{ animationDuration: `${duration}s` }}
      >
        {loopImages.map((image, index) => {
          const baseIndex = index % images.length;
          return (
            <MarqueeCard
              key={`${direction}-${image.id}-${index}`}
              image={image}
              sizeClass={CARD_SIZES[baseIndex % CARD_SIZES.length]}
            />
          );
        })}
      </div>
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
    if (!templates) return [];
    return canLoadAvif === false
      ? getMobileCompatibleLandingImages(templates)
      : templates;
  }, [canLoadAvif, templates]);

  const { top: rowTop, bottom: rowBottom } = React.useMemo(() => {
    const cdn =
      supportedTemplates.length > 0
        ? supportedTemplates
        : LANDING_MARQUEE_IMAGES;
    return buildExclusiveHeroRows(cdn);
  }, [supportedTemplates]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #ffffff 0%, #f5f0e8 50%, #ffffff 100%)",
        }}
      />

      <div className="lx-hero-parallax absolute inset-0">
        <img
          src={HERO_BG_URL}
          alt=""
          className="h-full w-full scale-105 object-cover opacity-25 blur-[10px]"
          {...{ fetchpriority: "high" as const }}
          decoding="async"
        />
      </div>

      <div className="absolute inset-0 bg-white/40" />

      <div className="lx-hero-marquee absolute inset-0 z-0 opacity-[0.55]">
        {/* Bandeau des 2 rangées : référentiel pour centrer le cadran (top 50%) */}
        <div
          className="lx-hero-marquee-band absolute left-0 right-0"
          style={{
            top: "var(--lx-marquee-top, 30%)",
            height:
              "calc(2 * var(--lx-marquee-row-h, 220px) + var(--lx-marquee-gap, 40px))",
          }}
        >
          <MarqueeRow
            images={rowTop}
            direction="left"
            duration={72}
            top="0"
            rowClassName="lx-hero-marquee-row--top"
          />
          <MarqueeRow
            images={rowBottom}
            direction="right"
            duration={84}
            top="calc(var(--lx-marquee-row-h, 220px) + var(--lx-marquee-gap, 40px))"
            rowClassName="lx-hero-marquee-row--bottom"
          />
        </div>
      </div>

      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-white/50 via-transparent to-[var(--lx-surface)]" />
    </div>
  );
}
