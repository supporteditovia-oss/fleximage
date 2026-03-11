import * as React from "react";
import { ChevronDown } from "lucide-react";

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left rounded-2xl border border-border bg-card px-5 py-4 shadow-sm hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold">{question}</span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open && (
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          {answer}
        </p>
      )}
    </button>
  );
}

const faqs = [
  {
    q: "C'est quoi TurboPrank ?",
    a: "TurboPrank est un outil qui utilise l'IA pour générer des images de pranks hyper réalistes en quelques secondes. Upload ta photo, décris ton idée, et l'IA fait le reste.",
  },
  {
    q: "Les images générées sont-elles réalistes ?",
    a: "Oui, notre IA est entraînée pour produire des résultats très convaincants. Parfait pour faire des blagues à tes proches !",
  },
  {
    q: "C'est légal ?",
    a: "TurboPrank est conçu pour le divertissement entre proches. L'utilisation à des fins de harcèlement, diffamation ou fraude est strictement interdite et contraire à nos CGU.",
  },
  {
    q: "Combien ça coûte ?",
    a: "Tu peux créer tes premiers pranks gratuitement. Des crédits supplémentaires sont disponibles via nos forfaits accessibles.",
  },
  {
    q: "Mes images sont-elles stockées ?",
    a: "Tes images sont traitées de manière sécurisée. Tu peux supprimer tes créations à tout moment depuis ton compte.",
  },
  {
    q: "Quel type de pranks je peux créer ?",
    a: "Tickets d'amende, fausses échographies, lettres de licenciement, tickets de loto gagnants, ruptures par SMS, invitations VIP… Les possibilités sont quasi illimitées !",
  },
];

export default function FaqSection() {
  return (
    <section className="py-16 md:py-24 px-4">
      <div className="max-w-2xl mx-auto">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-10">
          Questions fréquentes
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <FaqItem key={i} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
