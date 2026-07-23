import * as React from "react";
import { Link, useParams } from "wouter";
import { ArrowRight, Gem } from "lucide-react";
import NotFound from "@/pages/not-found";
import LandingHeader from "@/components/marketing/LandingHeader";
import Footer from "@/components/marketing/Footer";
import { setDocumentMeta } from "@/lib/document-meta";
import {
  getSeoNicheBySlug,
  getSeoNicheCategory,
  getSeoNichePath,
  SEO_DIRECTORY_PATH,
  SEO_NICHES,
  type SeoNiche,
} from "@shared/seo-niches";
import "@/pages/landing.css";

function NicheHero({ niche }: { niche: SeoNiche }) {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-10 md:pb-24 md:pt-16">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(201,162,39,0.18) 0%, transparent 55%), linear-gradient(180deg, #f2f0ec 0%, #e9e7e2 100%)",
        }}
      />
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--lx-bronze)]">
          LuxeFlexIA
        </p>
        <h1 className="lx-display text-balance text-3xl font-semibold leading-[1.12] text-[var(--lx-ink)] md:text-5xl">
          {niche.h1}
        </h1>
        <p className="mt-4 max-w-xl text-base font-medium leading-relaxed text-[var(--lx-muted)] md:text-lg">
          {niche.heroSubtitle}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="lx-btn-gold inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold"
          >
            Créer ma photo maintenant
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/generate"
            className="inline-flex min-h-12 items-center rounded-full border border-black/10 bg-white/70 px-6 text-sm font-semibold text-[var(--lx-ink)] transition-colors hover:border-[var(--lx-gold)]/40"
          >
            Ouvrir le générateur
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function SeoNicheLanding() {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug || "";
  const niche = getSeoNicheBySlug(slug);

  React.useEffect(() => {
    if (!niche) return;
    setDocumentMeta({
      title: niche.metaTitle,
      description: niche.metaDescription,
      canonicalPath: getSeoNichePath(niche.slug),
    });
    void import("@/lib/funnel-tracker").then(({ trackFunnelStep }) => {
      trackFunnelStep("landing", { source: "seo_niche", slug: niche.slug });
    });
  }, [niche]);

  if (!niche) {
    return <NotFound />;
  }

  const category = getSeoNicheCategory(niche.categoryId);
  const related = SEO_NICHES.filter(
    (item) => item.categoryId === niche.categoryId && item.slug !== niche.slug,
  ).slice(0, 4);

  return (
    <div className="luxeflexia-landing relative min-h-screen overflow-x-hidden">
      <LandingHeader />
      <NicheHero niche={niche} />

      <section className="mx-auto max-w-3xl px-4 pb-16">
        <h2 className="lx-display text-2xl font-semibold text-[var(--lx-ink)]">
          Comment ça marche avec LuxeFlexIA
        </h2>
        <ol className="mt-5 space-y-3 text-[var(--lx-muted)]">
          <li>1. Uploadez une photo claire de vous.</li>
          <li>2. Décrivez la scène ({niche.h1.toLowerCase()}).</li>
          <li>3. Laissez l&apos;IA générer un rendu hyper-réaliste en quelques secondes.</li>
        </ol>
        <p className="mt-6 text-sm leading-relaxed text-[var(--lx-muted)]">
          {category
            ? `Cette page fait partie de la catégorie « ${category.label} ». `
            : null}
          LuxeFlexIA est conçu pour le divertissement et les pranks entre proches.
          Utilisez vos créations de façon responsable.
        </p>
        <p className="mt-4">
          <Link
            href={SEO_DIRECTORY_PATH}
            className="text-sm font-semibold text-[var(--lx-bronze)] underline-offset-4 hover:underline"
          >
            Voir tous nos générateurs (pranks, luxe, voyage)
          </Link>
        </p>
      </section>

      {related.length > 0 ? (
        <section className="border-t border-black/8 bg-[var(--lx-surface-2)]/60 px-4 py-14">
          <div className="mx-auto max-w-5xl">
            <h2 className="lx-display text-center text-2xl font-semibold text-[var(--lx-ink)]">
              Autres idées dans la même catégorie
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={getSeoNichePath(item.slug)}
                    className="group flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-black/8 bg-white/80 px-4 py-3 transition-colors hover:border-[var(--lx-gold)]/45"
                  >
                    <span className="text-sm font-semibold text-[var(--lx-ink)]">
                      {item.h1}
                    </span>
                    <Gem
                      className="h-4 w-4 shrink-0 text-[var(--lx-gold)] opacity-70 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <Footer />
    </div>
  );
}
