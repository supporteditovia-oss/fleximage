import * as React from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import ScrollReveal from "@/components/marketing/ScrollReveal";

const FAQ_INDEXES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export default function FaqSection() {
  const { t, i18n } = useTranslation();
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  const faqs = React.useMemo(
    () =>
      FAQ_INDEXES.map((index) => ({
        question: t(`landing.faq.q${index}`),
        answer: t(`landing.faq.a${index}`),
      })),
    [t, i18n.resolvedLanguage],
  );

  const faqJsonLd = React.useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    }),
    [faqs],
  );

  return (
    <section
      id="ressources"
      className="scroll-mt-20 bg-[var(--lx-surface)] px-4 py-16 md:py-24"
      aria-labelledby="faq-heading"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="mx-auto max-w-2xl">
        <ScrollReveal>
          <h2
            id="faq-heading"
            className="lx-display text-center text-3xl font-semibold tracking-tight text-[var(--lx-ink)] md:text-4xl"
          >
            {t("landing.faq.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-sm text-[var(--lx-muted)] md:text-base">
            {t("landing.faq.subtitle")}
          </p>
        </ScrollReveal>

        <div className="mt-10 space-y-3" role="list">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-button-${index}`;

            return (
              <ScrollReveal
                key={`${i18n.resolvedLanguage}-${faq.question}`}
                delayClassName={`lx-reveal-delay-${Math.min(index + 1, 3)}`}
              >
                <div
                  role="listitem"
                  className="overflow-hidden rounded-xl border border-black/8 bg-[var(--lx-surface-2)] transition-colors hover:border-[var(--lx-gold)]/35"
                >
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() =>
                      setOpenIndex((current) =>
                        current === index ? null : index,
                      )
                    }
                    className="flex w-full min-h-12 items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="lx-display text-base font-semibold md:text-lg">
                      <span className="text-[var(--lx-gold)]">{faq.question}</span>
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-[var(--lx-gold)] transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    />
                  </button>

                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <p className="px-5 pb-4 text-sm leading-relaxed text-[var(--lx-muted)] md:text-[0.95rem]">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
