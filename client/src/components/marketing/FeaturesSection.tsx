import { ShieldCheck, Zap, Sparkles } from "lucide-react";
import ScrollReveal from "@/components/marketing/ScrollReveal";
import { BrandMark } from "@/components/BrandMark";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Sécurité privée",
    description:
      "Vos données et vos créations restent 100% privées et sécurisées",
  },
  {
    icon: Zap,
    title: "Génération IA super rapide",
    description:
      "Des résultats ultra-rapides pour donner vie à tes idées sans attendre",
  },
  {
    icon: Sparkles,
    title: "Qualité pro",
    description:
      "Des rendus haute définition dignes des plus grandes exigences",
  },
] as const;

export default function FeaturesSection() {
  return (
    <section
      id="fonctionnalites"
      className="scroll-mt-20 px-4 py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <h2 className="lx-display text-center text-3xl font-semibold tracking-tight text-[var(--lx-ink)] md:text-4xl">
            Pourquoi <BrandMark className="whitespace-nowrap text-[inherit] font-semibold tracking-tight" />
          </h2>
        </ScrollReveal>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <ScrollReveal
                key={feature.title}
                delayClassName={`lx-reveal-delay-${index + 1}`}
              >
                <div className="flex h-full flex-col items-start gap-4 rounded-xl border border-black/5 bg-[var(--lx-surface-2)] p-6 md:p-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--lx-gold)]/12 text-[var(--lx-bronze)]">
                    <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--lx-ink)]">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--lx-muted)] md:text-base">
                    {feature.description}
                  </p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
