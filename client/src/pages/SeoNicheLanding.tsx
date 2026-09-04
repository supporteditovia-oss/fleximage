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
  getSeoNiches,
  SEO_DIRECTORY_PATH,
  type SeoNiche,
} from "@shared/seo-niches";
import { DEFAULT_SITE_ORIGIN } from "@shared/site-seo";
import { useTranslation } from "react-i18next";
import { localeHref } from "@/lib/locale-href";
import "@/pages/landing.css";

function NicheHero({ niche }: { niche: SeoNiche }) {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-10 md:pb-16 md:pt-16">
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
            {t("landing.seo.createPhoto")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/generate"
            className="inline-flex min-h-12 items-center rounded-full border border-black/10 bg-white/70 px-6 text-sm font-semibold text-[var(--lx-ink)] transition-colors hover:border-[var(--lx-gold)]/40"
          >
            {t("landing.seo.openGenerator")}
          </Link>
        </div>
      </div>
    </section>
  );
}

function buildNicheJsonLd(niche: SeoNiche) {
  const url = `${DEFAULT_SITE_ORIGIN}${getSeoNichePath(niche.slug)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: niche.metaTitle,
        description: niche.metaDescription,
        url,
        isPartOf: {
          "@type": "WebSite",
          name: "LuxeFlexIA",
          url: DEFAULT_SITE_ORIGIN,
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "LuxeFlexIA",
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        url: DEFAULT_SITE_ORIGIN,
        description: niche.metaDescription,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: niche.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Accueil",
            item: `${DEFAULT_SITE_ORIGIN}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Générateurs",
            item: `${DEFAULT_SITE_ORIGIN}${SEO_DIRECTORY_PATH}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: niche.h1,
            item: url,
          },
        ],
      },
    ],
  };
}

export default function SeoNicheLanding() {
  const { t, i18n } = useTranslation();
  const params = useParams<{ slug?: string }>();
  const slug = params.slug || "";
  const locale = i18n.resolvedLanguage;
  const niche = getSeoNicheBySlug(slug, locale);

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

  const category = getSeoNicheCategory(niche.categoryId, locale);
  const related = getSeoNiches(locale).filter(
    (item) => item.categoryId === niche.categoryId && item.slug !== niche.slug,
  ).slice(0, 6);
  const jsonLd = buildNicheJsonLd(niche);

  return (
    <div className="luxeflexia-landing relative min-h-screen overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingHeader />
      <NicheHero niche={niche} />

      <section className="mx-auto max-w-3xl px-4 pb-12">
        <p className="text-base leading-relaxed text-[var(--lx-muted)]">
          {niche.intro}
        </p>
        <ul className="mt-6 space-y-2 text-[var(--lx-muted)]">
          {niche.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--lx-gold)]" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-12">
        <h2 className="lx-display text-2xl font-semibold text-[var(--lx-ink)]">
          {t("landing.seo.howTitle")}
        </h2>
        <ol className="mt-5 space-y-3 text-[var(--lx-muted)]">
          <li>1. {t("landing.seo.how1")}</li>
          <li>2. {t("landing.seo.how2")}</li>
          <li>3. {t("landing.seo.how3")}</li>
        </ol>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-12">
        <h2 className="lx-display text-2xl font-semibold text-[var(--lx-ink)]">
          {t("landing.seo.promptIdeas")}
        </h2>
        <ul className="mt-5 space-y-3">
          {niche.promptIdeas.map((idea) => (
            <li
              key={idea}
              className="rounded-2xl border border-black/8 bg-white/70 px-4 py-3 text-sm leading-relaxed text-[var(--lx-ink)]"
            >
              {idea}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-12">
        <h2 className="lx-display text-2xl font-semibold text-[var(--lx-ink)]">
          {t("landing.seo.faqTitle")}
        </h2>
        <div className="mt-5 space-y-4">
          {niche.faqs.map((faq) => (
            <div key={faq.question}>
              <h3 className="text-base font-semibold text-[var(--lx-ink)]">
                {faq.question}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--lx-muted)]">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
        {niche.searchPhrases.length > 0 ? (
          <p className="mt-6 text-sm leading-relaxed text-[var(--lx-muted)]">
            {t("landing.seo.searches")}{" "}
            {niche.searchPhrases.join(" · ")}.
          </p>
        ) : null}
        <p className="mt-4 text-sm leading-relaxed text-[var(--lx-muted)]">
          {category
            ? `${t("landing.seo.categoryPart", { label: category.label })} `
            : null}
          {t("landing.seo.disclaimer")}
        </p>
        <p className="mt-4">
          <Link
            href={localeHref(SEO_DIRECTORY_PATH, locale)}
            className="text-sm font-semibold text-[var(--lx-bronze)] underline-offset-4 hover:underline"
          >
            {t("landing.seo.allGenerators")}
          </Link>
        </p>
      </section>

      {related.length > 0 ? (
        <section className="border-t border-black/8 bg-[var(--lx-surface-2)]/60 px-4 py-14">
          <div className="mx-auto max-w-5xl">
            <h2 className="lx-display text-center text-2xl font-semibold text-[var(--lx-ink)]">
              {t("landing.seo.relatedTitle")}
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={getSeoNichePath(item.slug, locale)}
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
