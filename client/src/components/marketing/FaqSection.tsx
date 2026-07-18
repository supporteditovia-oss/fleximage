import * as React from "react";
import { ChevronDown } from "lucide-react";
import ScrollReveal from "@/components/marketing/ScrollReveal";

export const LANDING_FAQS = [
  {
    question: "Qu'est-ce que LuxeFlexIA ?",
    answer:
      "LuxeFlexIA est une plateforme qui utilise l'intelligence artificielle pour transformer tes photos et te mettre en scène dans des univers de luxe (voitures de sport, villas, jets privés, tables VIP) en quelques secondes, sans montage photo ni compétence technique.",
  },
  {
    question: "Comment fonctionne la génération d'image par IA ?",
    answer:
      "Tu uploades simplement une photo de toi, tu décris la scène que tu veux (ou tu choisis un modèle prédéfini), et notre IA génère une image réaliste te plaçant dans ce décor de luxe en quelques instants.",
  },
  {
    question: "Est-ce que mes photos sont en sécurité ?",
    answer:
      "Oui, toutes les photos uploadées sont traitées de manière sécurisée et ne sont jamais partagées ni utilisées pour entraîner d'autres modèles sans ton consentement.",
  },
  {
    question: "Combien de temps faut-il pour générer une image ?",
    answer:
      "La génération prend généralement entre quelques secondes et une minute, selon la complexité de la demande et l'affluence sur la plateforme.",
  },
  {
    question: "Quelle est la différence entre le plan gratuit et le plan payant ?",
    answer:
      "Le plan gratuit permet de découvrir l'interface, tandis que les crédits ou l'abonnement payant débloquent la génération en haute résolution, le téléchargement illimité et l'accès à l'historique complet de tes créations.",
  },
  {
    question: "Puis-je utiliser mes images générées sur les réseaux sociaux ?",
    answer:
      "Oui, une fois générées et téléchargées, tes images t'appartiennent et tu peux les publier librement sur Instagram, TikTok, Snapchat ou tout autre réseau social.",
  },
  {
    question: "Ai-je besoin de compétences en photographie ou en retouche photo ?",
    answer:
      "Non, aucune compétence n'est requise : l'intelligence artificielle s'occupe de tout le travail technique, tu n'as qu'à choisir ta photo et décrire le résultat souhaité.",
  },
  {
    question: "Quels types de décors de luxe sont disponibles ?",
    answer:
      "Voitures de sport, villas avec piscine, jets privés, yachts, restaurants VIP, et de nombreux autres univers premium, avec de nouveaux décors ajoutés régulièrement.",
  },
  {
    question: "Puis-je annuler mon abonnement à tout moment ?",
    answer:
      "Oui, tu peux annuler ton abonnement directement depuis ton espace compte, sans engagement ni frais cachés.",
  },
  {
    question: "Les images générées sont-elles vraiment réalistes ?",
    answer:
      "Oui, notre IA est spécialement optimisée pour produire des rendus photoréalistes qui respectent les proportions, l'éclairage et les détails du visage pour un résultat crédible et professionnel.",
  },
] as const;

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: LANDING_FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function FaqSection() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  return (
    <section
      id="ressources"
      className="scroll-mt-20 bg-[var(--lx-surface)] px-4 py-16 md:py-24"
      aria-labelledby="faq-heading"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />

      <div className="mx-auto max-w-2xl">
        <ScrollReveal>
          <h2
            id="faq-heading"
            className="lx-display text-center text-3xl font-semibold tracking-tight text-[var(--lx-ink)] md:text-4xl"
          >
            Questions fréquentes
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-sm text-[var(--lx-muted)] md:text-base">
            Tout ce que tu dois savoir sur LuxeFlexIA
          </p>
        </ScrollReveal>

        <div className="mt-10 space-y-3" role="list">
          {LANDING_FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-button-${index}`;

            return (
              <ScrollReveal
                key={faq.question}
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

                  {/* Answer always in the DOM for crawlability (visually collapsed when closed) */}
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
