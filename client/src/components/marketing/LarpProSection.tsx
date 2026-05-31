import * as React from "react";
import type { ComponentType } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Car,
  Plane,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type ProCardItem = {
  icon: ComponentType<{ className?: string }>;
  text: string;
  tone: string;
  label: string;
};

const PRO_ITEM_KEYS = [
  "larpPro.item1",
  "larpPro.item2",
  "larpPro.item3",
  "larpPro.item4",
  "larpPro.item5",
  "larpPro.item6",
] as const;

const PRO_ICONS = [ShoppingBag, Car, UtensilsCrossed, Plane, BarChart3, Sparkles];

const CARD_TONES = [
  "from-zinc-950 via-stone-800 to-zinc-100",
  "from-neutral-950 via-zinc-700 to-slate-100",
  "from-stone-950 via-neutral-700 to-zinc-100",
  "from-zinc-900 via-slate-600 to-white",
  "from-neutral-950 via-sky-950 to-zinc-100",
  "from-zinc-950 via-neutral-700 to-rose-100",
];

function LarpStackCard({
  item,
  index,
  total,
  offset,
  onClick,
}: {
  item: ProCardItem;
  index: number;
  total: number;
  offset: number;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const isActive = offset === 0;

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
      <div className={`absolute inset-0 bg-gradient-to-br ${item.tone}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_24%,rgb(255_255_255_/_0.52),transparent_25%),linear-gradient(150deg,transparent_0_35%,rgb(255_255_255_/_0.42)_36%_44%,transparent_45%_100%)]" />
      <div className="absolute -right-16 top-12 h-52 w-52 rounded-full border-[28px] border-white/28" />
      <div className="absolute -left-10 bottom-10 h-36 w-36 rounded-full border-[22px] border-black/18" />
      <div className="absolute inset-0 bg-[repeating-radial-gradient(circle_at_0_0,rgb(255_255_255_/_0.22)_0_1px,transparent_1px_5px)] opacity-35 mix-blend-overlay" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/12 to-white/20" />

      <div className="relative flex h-full flex-col justify-between p-5 text-white md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/16 backdrop-blur-md">
            <Icon className="h-5 w-5" />
          </div>
          <span className="rounded-full border border-white/25 bg-black/25 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white/85 backdrop-blur-md">
            {index + 1}/{total}
          </span>
        </div>

        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">
            {item.label}
          </p>
          <h3 className="text-balance font-display text-2xl font-bold leading-[1.02] tracking-normal drop-shadow-[0_2px_16px_rgb(0_0_0_/_0.5)] md:text-3xl">
            {item.text}
          </h3>
        </div>
      </div>
    </button>
  );
}

export default function LarpProSection() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [activeIndex, setActiveIndex] = React.useState(0);

  const items: ProCardItem[] = PRO_ITEM_KEYS.map((key, index) => ({
    icon: PRO_ICONS[index],
    text: t(key),
    tone: CARD_TONES[index],
    label: `LARP ${String(index + 1).padStart(2, "0")}`,
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
            {visibleItems.map(({ item, index, offset }) => (
              <LarpStackCard
                key={item.text}
                item={item}
                index={index}
                total={items.length}
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
