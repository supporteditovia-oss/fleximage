import * as React from "react";
import { useQuery } from "@tanstack/react-query";

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

function useMarquee(reverse: boolean) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let offset = reverse ? -(el.scrollWidth / 2) : 0;
    let rafId: number;
    let last: number | null = null;

    const step = (now: number) => {
      if (last !== null) {
        // Normalize speed to 60fps regardless of actual refresh rate
        const delta = (now - last) / 16.667;
        if (reverse) {
          offset += SPEED * delta;
          if (offset >= 0) offset = -(el.scrollWidth / 2);
        } else {
          offset -= SPEED * delta;
          if (offset <= -(el.scrollWidth / 2)) offset = 0;
        }
        el.style.transform = `translate3d(${offset}px, 0, 0)`;
      }
      last = now;
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [reverse]);

  return ref;
}

function CardImage({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

const MarqueeCard = React.memo(function MarqueeCard({
  template,
}: {
  template: MarqueeTemplate;
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
          alt={`${template.name} — avant`}
        />
      </div>
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-white/25 z-[5]" />
      <div className="absolute inset-x-0 bottom-0 h-[calc(50%-1px)] overflow-hidden">
        <CardImage
          src={template.example_after_url}
          alt={`${template.name} — après`}
        />
      </div>
      <div className="absolute top-2 right-2 z-10">
        <span className="text-[10px] font-medium text-white/80 bg-black/50 rounded-full px-2 py-0.5">
          Avant
        </span>
      </div>
      <div className="absolute top-[calc(50%+6px)] right-2 z-10">
        <span className="text-[10px] font-medium text-white/80 bg-black/50 rounded-full px-2 py-0.5">
          Après
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
}: {
  items: MarqueeTemplate[];
  reverse: boolean;
  placeholders: boolean;
}) {
  const ref = useMarquee(reverse);
  const placeholderCount = 6;

  return (
    <div className="overflow-hidden">
      <div
        ref={ref}
        className="flex gap-4"
        style={{ willChange: "transform", backfaceVisibility: "hidden" }}
      >
        {placeholders
          ? [...Array(2)].map((_, d) => (
              <React.Fragment key={d}>
                {Array.from({ length: placeholderCount }, (_, i) => (
                  <PlaceholderCard key={`p-${d}-${i}`} />
                ))}
              </React.Fragment>
            ))
          : [...Array(2)].map((_, d) => (
              <React.Fragment key={d}>
                {items.map((t, i) => (
                  <MarqueeCard key={`c-${d}-${i}`} template={t} />
                ))}
              </React.Fragment>
            ))}
      </div>
    </div>
  );
}

export default function ImageMarquee() {
  const { data: templates } = useQuery<MarqueeTemplate[]>({
    queryKey: ["marquee-templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates/marquee");
      if (!res.ok) throw new Error("Failed to fetch marquee templates");
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
          Des résultats{" "}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            bluffants
          </span>
        </h2>
        <p className="text-sm md:text-base text-muted-foreground text-center mt-2">
          Quelques exemples de pranks générés par nos utilisateurs
        </p>
      </div>

      <MarqueeRow items={row1} reverse={false} placeholders={!hasData} />
      <div className="h-4" />
      <MarqueeRow items={row2} reverse={true} placeholders={!hasData} />
    </section>
  );
}
