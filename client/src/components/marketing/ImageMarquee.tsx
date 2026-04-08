import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

interface MarqueeTemplate {
  name: string;
  example_before_url: string | null;
  example_after_url: string;
}

const MIN_CARDS_PER_ROW = 8;
const SPEED = 0.5; // px per frame at 60fps

function padToMin<T>(items: T[], min: number): T[] {
  if (items.length === 0) return items;
  const result: T[] = [];
  while (result.length < min) {
    result.push(...items);
  }
  return result;
}

// Custom infinite CSS animation for marquee is now handling the scrolling instead of JS
// The Tailwind config needs to have `animate-marquee` defined or we use inline styles.
// For robust infinite scroll, we simply set up the track so it can loop seamlessly.

function CardImage({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

const MarqueeCard = React.memo(function MarqueeCard({
  template,
  beforeLabel,
  afterLabel,
}: {
  template: MarqueeTemplate;
  beforeLabel: string;
  afterLabel: string;
}) {
  const hasBefore = !!template.example_before_url;

  if (!hasBefore) {
    return (
      <div className="flex-shrink-0 w-48 h-72 md:w-56 md:h-80 rounded-2xl overflow-hidden relative bg-muted/30">
        <CardImage src={template.example_after_url} alt={template.name} />
        <div className="absolute bottom-2 left-2 right-2 z-10">
          <span
            className="text-[11px] font-semibold text-white truncate block"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
          >
            {template.name}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-48 h-72 md:w-56 md:h-80 rounded-2xl overflow-hidden relative bg-muted/30">
      <div className="absolute inset-x-0 top-0 h-[calc(50%-1px)] overflow-hidden">
        <CardImage
          src={template.example_before_url!}
          alt={`${template.name} - ${beforeLabel}`}
        />
      </div>
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-white/25 z-[5]" />
      <div className="absolute inset-x-0 bottom-0 h-[calc(50%-1px)] overflow-hidden">
        <CardImage
          src={template.example_after_url}
          alt={`${template.name} - ${afterLabel}`}
        />
      </div>
      <div className="absolute top-2 right-2 z-10">
        <span className="text-[10px] font-medium text-white/80 bg-black/50 rounded-full px-2 py-0.5">
          {beforeLabel}
        </span>
      </div>
      <div className="absolute top-[calc(50%+6px)] right-2 z-10">
        <span className="text-[10px] font-medium text-white/80 bg-black/50 rounded-full px-2 py-0.5">
          {afterLabel}
        </span>
      </div>
      <div className="absolute bottom-2 left-2 right-2 z-10">
        <span
          className="text-[11px] font-semibold text-white truncate block"
          style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
        >
          {template.name}
        </span>
      </div>
    </div>
  );
});

function PlaceholderCard() {
  return (
    <div className="flex-shrink-0 w-48 h-72 md:w-56 md:h-80 rounded-2xl overflow-hidden relative bg-muted/20">
      <div className="absolute inset-x-0 top-0 h-[calc(50%-1px)] bg-muted/20" />
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-white/10" />
      <div className="absolute inset-x-0 bottom-0 h-[calc(50%-1px)] bg-muted/15" />
    </div>
  );
}

function MarqueeRow({
  items,
  reverse,
  placeholders,
  beforeLabel,
  afterLabel,
}: {
  items: MarqueeTemplate[];
  reverse: boolean;
  placeholders: boolean;
  beforeLabel: string;
  afterLabel: string;
}) {
  const placeholderCount = 6;
  const content = placeholders
    ? Array.from({ length: placeholderCount }, (_, i) => (
        <PlaceholderCard key={`p-${i}`} />
      ))
    : items.map((t, i) => (
        <MarqueeCard
          key={`c-${i}`}
          template={t}
          beforeLabel={beforeLabel}
          afterLabel={afterLabel}
        />
      ));

  return (
    <div className="flex overflow-hidden relative user-select-none gap-[1rem] group [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div 
        className="flex shrink-0 justify-around gap-[1rem] min-w-full"
        style={{
          animation: `scroll ${placeholders ? 30 : 60}s linear infinite ${reverse ? "reverse" : "normal"}`,
        }}
      >
        {content}
      </div>
      <div 
        className="flex shrink-0 justify-around gap-[1rem] min-w-full"
        aria-hidden="true"
        style={{
          animation: `scroll ${placeholders ? 30 : 60}s linear infinite ${reverse ? "reverse" : "normal"}`,
        }}
      >
        {content}
      </div>
    </div>
  );
}

export default function ImageMarquee() {
  const { t } = useTranslation();

  const { data: templates } = useQuery<MarqueeTemplate[]>({
    queryKey: ["marquee-templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates/marquee");
      if (!res.ok) throw new Error(t("marquee.fetchError"));
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const hasData = templates && templates.length > 0;

  const mid = hasData ? Math.ceil(templates.length / 2) : 0;
  const row1 = hasData
    ? padToMin(templates.slice(0, mid), MIN_CARDS_PER_ROW)
    : [];
  const row2 = hasData ? padToMin(templates.slice(mid), MIN_CARDS_PER_ROW) : [];

  return (
    <section className="py-16 md:py-24 overflow-hidden">
      <div className="max-w-3xl mx-auto px-4 mb-10">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-center">
          {t("marquee.titlePrefix")} {" "}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {t("marquee.titleGradient")}
          </span>
        </h2>
        <p className="text-sm md:text-base text-muted-foreground text-center mt-2">
          {t("marquee.subtitle")}
        </p>
      </div>

      <MarqueeRow
        items={row1}
        reverse={false}
        placeholders={!hasData}
        beforeLabel={t("marquee.before")}
        afterLabel={t("marquee.after")}
      />
      <div className="h-4" />
      <MarqueeRow
        items={row2}
        reverse={true}
        placeholders={!hasData}
        beforeLabel={t("marquee.before")}
        afterLabel={t("marquee.after")}
      />
    </section>
  );
}
