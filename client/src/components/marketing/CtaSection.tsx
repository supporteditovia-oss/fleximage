import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function CtaSection() {
  return (
    <section className="py-16 md:py-24 px-4">
      <div className="max-w-2xl mx-auto text-center rounded-3xl border border-primary/20 bg-card p-10 md:p-14 shadow-xl shadow-primary/10">
        <h2 className="font-display text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Prêt à créer ton premier prank ?
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-md mx-auto">
          Rejoins des milliers d'utilisateurs et commence à générer des images bluffantes en quelques secondes.
        </p>
        <div className="mt-8">
          <Link href="/register">
            <Button className="rounded-full h-12 px-10 text-base font-semibold border-0 shadow-none active:scale-95 transition-transform gap-2 group bg-primary text-primary-foreground hover:bg-secondary">
              Commencer gratuitement
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
