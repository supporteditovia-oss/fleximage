import * as React from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left rounded-lg border border-border bg-card px-5 py-4 shadow-sm hover:border-foreground/30 hover:shadow-md transition-all"
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

export default function FaqSection() {
  const { t } = useTranslation();
  const faqIds = [
    "larpking",
    "realistic",
    "legal",
    "pricing",
    "storage",
    "types",
  ] as const;

  const faqs = faqIds.map((id) => ({
    q: t(`faq.items.${id}Q`),
    a: t(`faq.items.${id}A`),
  }));

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="max-w-2xl mx-auto">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-10">
          {t("faq.titlePrefix")} {" "}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {t("faq.titleGradient")}
          </span>
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
