import ScrollReveal from "@/components/marketing/ScrollReveal";

/**
 * Images CDN lifestyle (même pool que le Hero) — URLs webp vérifiées.
 * Pas de dépendance API pour éviter les cartes vides.
 */
const SHOWCASE_ITEMS = [
  {
    id: "watch",
    label: "Montre de luxe au poignet",
    src: "https://media.larpking.com/landing/marquee/webp/99e8d81e-4195-4490-a85a-e47eebd20184.webp",
  },
  {
    id: "car",
    label: "Voiture de sport",
    src: "https://media.larpking.com/landing/marquee/webp/f234da62-79af-4695-94c2-26875d9067bb.webp",
  },
  {
    id: "villa",
    label: "Villa premium",
    src: "https://media.larpking.com/landing/marquee/webp/bb04deea-c7b1-46f0-a816-d3e8be84fec8.webp",
  },
] as const;

function ShowcaseCard({
  src,
  label,
  delayClassName,
}: {
  src: string;
  label: string;
  delayClassName: string;
}) {
  return (
    <ScrollReveal delayClassName={delayClassName} className="h-full">
      <article className="lx-showcase-card group relative aspect-[3/4] overflow-hidden rounded-xl bg-[var(--lx-ink-soft)] shadow-[0_20px_50px_rgba(18,16,14,0.12)]">
        <img
          src={src}
          alt={label}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <p className="lx-showcase-label absolute inset-x-0 bottom-0 p-4 text-sm font-medium text-white md:p-5 md:text-base">
          {label}
        </p>
      </article>
    </ScrollReveal>
  );
}

export default function ShowcaseSection() {
  return (
    <section
      id="showcase"
      className="scroll-mt-20 bg-[var(--lx-surface-2)] px-4 py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <h2 className="lx-display text-center text-3xl font-semibold tracking-tight text-[var(--lx-ink)] md:text-4xl">
            Comme un pro
          </h2>
        </ScrollReveal>

        <div
          id="solutions"
          className="lx-showcase-grid mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
        >
          {SHOWCASE_ITEMS.map((item, index) => (
            <ShowcaseCard
              key={item.id}
              src={item.src}
              label={item.label}
              delayClassName={`lx-reveal-delay-${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
