import * as React from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import LandingHeader from "@/components/marketing/LandingHeader";
import Footer from "@/components/marketing/Footer";
import { setDocumentMeta } from "@/lib/document-meta";
import {
  getSeoNichePath,
  SEO_DIRECTORY_PATH,
  SEO_NICHE_CATEGORIES,
  SEO_NICHES,
  getSeoNichesByCategory,
} from "@shared/seo-niches";
import "@/pages/landing.css";

const DIRECTORY_TITLE =
  "Tous nos générateurs IA (Pranks, Luxe, Voyage) — LuxeFlexIA";
const DIRECTORY_DESCRIPTION =
  "Annuaire LuxeFlexIA : générateurs de photos IA pour voitures de luxe, voyages, restaurants, pranks (fausse copine, soirée VIP) et flex lifestyle.";

export default function TousLesGenerateurs() {
  React.useEffect(() => {
    setDocumentMeta({
      title: DIRECTORY_TITLE,
      description: DIRECTORY_DESCRIPTION,
      canonicalPath: SEO_DIRECTORY_PATH,
    });
  }, []);

  return (
    <div className="luxeflexia-landing relative min-h-screen overflow-x-hidden">
      <LandingHeader />

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-10 md:pt-14">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--lx-bronze)]">
            Annuaire LuxeFlexIA
          </p>
          <h1 className="lx-display mt-3 text-balance text-3xl font-semibold text-[var(--lx-ink)] md:text-5xl">
            Tous nos générateurs (Pranks, Luxe, Voyage)
          </h1>
          <p className="mt-4 text-base font-medium text-[var(--lx-muted)] md:text-lg">
            {SEO_NICHES.length} scénarios prêts à générer : choisissez une niche
            et créez une photo hyper-réaliste avec LuxeFlexIA.
          </p>
        </header>

        <div className="mt-12 space-y-12">
          {SEO_NICHE_CATEGORIES.map((category) => {
            const niches = getSeoNichesByCategory(category.id);
            return (
              <section key={category.id} aria-labelledby={`cat-${category.id}`}>
                <h2
                  id={`cat-${category.id}`}
                  className="lx-display text-2xl font-semibold text-[var(--lx-ink)]"
                >
                  {category.label}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-[var(--lx-muted)]">
                  {category.description}
                </p>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {niches.map((niche) => (
                    <li key={niche.slug}>
                      <Link
                        href={getSeoNichePath(niche.slug)}
                        className="group flex min-h-[4.5rem] flex-col justify-center gap-1 rounded-2xl border border-black/8 bg-white/75 px-4 py-3 transition-colors hover:border-[var(--lx-gold)]/45"
                      >
                        <span className="text-sm font-semibold text-[var(--lx-ink)]">
                          {niche.h1}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--lx-bronze)]">
                          Ouvrir
                          <ArrowRight
                            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <div className="mt-14 flex justify-center">
          <Link
            href="/register"
            className="lx-btn-gold inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold"
          >
            Créer mon compte LuxeFlexIA
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
