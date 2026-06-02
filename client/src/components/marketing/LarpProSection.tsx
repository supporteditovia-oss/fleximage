import * as React from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  LANDING_MARQUEE_IMAGES,
  fetchLandingMarqueeImages,
  type LandingMarqueeImage,
} from "@/lib/landing-marquee-images";

type ProCardItem = {
  image: LandingMarqueeImage | null;
  text: string;
};

const PRO_ITEM_KEYS = [
  "larpPro.item1",
  "larpPro.item2",
  "larpPro.item3",
  "larpPro.item4",
  "larpPro.item5",
  "larpPro.item6",
  "larpPro.item7",
  "larpPro.item8",
] as const;

const PRO_IMAGE_IDS = [
  "d715481e-a903-4c5d-8a9b-5f6ba27ed6ab",
  "f234da62-79af-4695-94c2-26875d9067bb",
  "a08e0089-297c-4428-8111-414e8152c0e5",
  "5613ecdb-f44c-4a39-8ee6-5e40f5e73358",
  "628fa562-e2f4-4fe1-af41-9c437ba36fd8",
  "6a462d38-4508-4156-86cb-5a3426febe11",
  "8ea369b8-1dba-438e-b0e5-4d9c97e5ccc6",
  "d9391a44-5583-4431-8ade-7e8a4d29cf92",
] as const;

function shuffledIndexes(length: number) {
  const indexes = Array.from({ length }, (_, index) => index);

  for (let i = indexes.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [indexes[i], indexes[randomIndex]] = [indexes[randomIndex], indexes[i]];
  }

  return indexes;
}

function LarpStackCard({
  item,
  offset,
  onClick,
}: {
  item: ProCardItem;
  offset: number;
  onClick: () => void;
}) {
  const isActive = offset === 0;
  const imageFetchPriority = isActive ? "high" : "auto";

  return (
    <button
      type="button"
      aria-label={item.text}
      aria-current={isActive ? "true" : undefined}
      onClick={isActive ? onClick : undefined}
      className="absolute inset-0 cursor-pointer overflow-hidden rounded-lg border border-black/15 bg-zinc-950 text-left shadow-[0_26px_70px_rgb(0_0_0_/_0.18)] outline-none transition-[transform,opacity,filter] duration-500 focus-visible:ring-2 focus-visible:ring-foreground/40"
      style={{
        zIndex: 20 - offset,
        opacity: offset > 3 ? 0 : 1 - offset * 0.16,
        pointerEvents: isActive ? "auto" : "none",
        transform: `translate3d(${offset * 18}px, ${offset * 14}px, 0) rotate(${offset * 2.6 - 1.5}deg) scale(${1 - offset * 0.055})`,
        filter: offset === 0 ? "none" : "saturate(0.72) brightness(0.82)",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {item.image ? (
        <>
          <img
            src={item.image.placeholder_url}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-90 blur-md"
          />
          <picture className="absolute inset-0 block h-full w-full">
            <source srcSet={item.image.avif_url} type="image/avif" />
            {item.image.webp_url ? (
              <source srcSet={item.image.webp_url} type="image/webp" />
            ) : null}
            <img
              src={item.image.webp_url ?? item.image.avif_url}
              alt=""
              loading="eager"
              {...{ fetchpriority: imageFetchPriority }}
              decoding="async"
              className="h-full w-full object-cover"
            />
          </picture>
        </>
      ) : (
        <div className="absolute inset-0 bg-zinc-950" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/24 to-black/10" />

      <div className="relative flex h-full flex-col justify-end p-5 text-white md:p-6">
        <h3 className="text-balance font-display text-2xl font-bold leading-[1.02] tracking-normal drop-shadow-[0_2px_16px_rgb(0_0_0_/_0.5)] md:text-3xl">
          {item.text}
        </h3>
      </div>
    </button>
  );
}

export default function LarpProSection() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [itemOrder] = React.useState(() => shuffledIndexes(PRO_ITEM_KEYS.length));
  const { data: marqueeImages } = useQuery<LandingMarqueeImage[]>({
    queryKey: ["landing-marquee-images"],
    queryFn: fetchLandingMarqueeImages,
    placeholderData: LANDING_MARQUEE_IMAGES,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const imagesById = React.useMemo(() => {
    return new Map((marqueeImages ?? []).map((image) => [image.id, image]));
  }, [marqueeImages]);

  const items: ProCardItem[] = itemOrder.map((originalIndex) => ({
    image: imagesById.get(PRO_IMAGE_IDS[originalIndex]) ?? null,
    text: t(PRO_ITEM_KEYS[originalIndex]),
  }));

  const visibleItems = items
    .map((item, index) => ({
      item,
      index,
      offset: (index - activeIndex + items.length) % items.length,
    }))
    .filter(({ offset }) => offset < 4)
    .sort((a, b) => b.offset - a.offset);

  const showNext = () => {
    setActiveIndex((current) => (current + 1) % items.length);
  };

  return (
    <section className="relative flex min-h-[100svh] h-[100svh] flex-col justify-center overflow-hidden px-4 pt-14 pb-10 md:pt-16 md:pb-12">

      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-7 md:gap-8">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-4xl">
            {t("larpPro.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground md:text-base">
            {t("larpPro.subtitle")}
          </p>
        </div>

        <div className="relative mx-auto h-[min(50svh,500px)] max-h-[500px] min-h-[300px] w-full max-w-[280px] md:h-[min(54svh,540px)] md:max-w-[300px]">
          <div className="absolute inset-y-0 left-1/2 aspect-[9/16] -translate-x-1/2">
            {visibleItems.map(({ item, offset }) => (
              <LarpStackCard
                key={item.text}
                item={item}
                offset={offset}
                onClick={showNext}
              />
            ))}
          </div>
        </div>

        <Button
          onClick={() => navigate("/register")}
          className="mt-1 shrink-0 rounded-full h-11 px-8 text-sm font-semibold border-0 shadow-none active:scale-95 transition-transform md:h-12 md:px-10 md:text-base"
        >
          {t("larpPro.cta")}
        </Button>
      </div>
    </section>
  );
}
