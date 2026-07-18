import { Link } from "wouter";
import ScrollReveal from "@/components/marketing/ScrollReveal";

export default function CtaSection() {
  return (
    <section
      id="entreprise"
      className="scroll-mt-20 relative overflow-hidden px-4 py-20 md:py-28"
    >
      <div
        id="tarifs"
        className="absolute inset-0 bg-[linear-gradient(160deg,#0c0b0a_0%,#1a1714_55%,#12100e_100%)]"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(201,162,39,0.22) 0%, transparent 65%)",
        }}
      />

      <ScrollReveal className="relative mx-auto max-w-2xl text-center">
        <h2 className="lx-display text-3xl font-semibold text-white md:text-4xl">
          Prêt à transformer ta réalité ?
        </h2>
        <div className="mt-8 flex justify-center">
          <Link
            href="/register"
            className="lx-btn-gold inline-flex min-h-12 items-center justify-center rounded-full px-10 text-base font-semibold"
          >
            Créer un compte
          </Link>
        </div>
      </ScrollReveal>
    </section>
  );
}
