import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface MarqueeTemplate {
  name: string;
  example_before_url: string | null;
  example_after_url: string;
}

const MIN_FRAMES = 10;
const FRAME_CLASS =
  "relative h-[clamp(9rem,28vh,18rem)] aspect-[9/16] flex-shrink-0 rounded-lg border border-foreground/10 bg-white/45 shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden";

function padToMin<T>(items: T[], min: number): T[] {
  if (items.length === 0) return items;
  const result: T[] = [];
  while (result.length < min) {
    result.push(...items);
  }
  return result;
}

function FrameCard({ template }: { template: MarqueeTemplate }) {
  const src = template.example_after_url;

  return (
    <div className={FRAME_CLASS}>
      <img
        src={src}
        alt={template.name}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover opacity-80 saturate-[0.85]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-white/35 via-transparent to-white/20" />
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
  items: MarqueeTemplate[];
  placeholders: boolean;
  duration: number;
  offsetY: string;
}) {
  const content = placeholders
    ? Array.from({ length: 8 }, (_, i) => (
        <PlaceholderFrame key={`placeholder-${i}`} index={i} />
      ))
    : items.map((template, i) => (
        <FrameCard key={`frame-${i}-${template.name}`} template={template} />
      ));

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
          {content}
        </div>
      ))}
    </div>
  );
}

export default function HeroBackgroundFrames() {
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
  const frames = hasData ? padToMin(templates, MIN_FRAMES) : [];
  const row1 = hasData ? frames.filter((_, i) => i % 2 === 0) : [];
  const row2 = hasData ? frames.filter((_, i) => i % 2 === 1) : [];

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-55 md:opacity-65 [mask-image:radial-gradient(ellipse_min(340px,88vw)_min(520px,52vh)_at_50%_56%,transparent_0%,transparent_38%,rgba(0,0,0,0.35)_52%,black_72%)]"
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

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_min(320px,84vw)_min(500px,50vh)_at_50%_56%,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.72)_38%,rgba(255,255,255,0.18)_58%,transparent_72%)]" />
    </div>
  );
}
