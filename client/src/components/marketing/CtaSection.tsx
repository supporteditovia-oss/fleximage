import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function CtaSection() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  return (
    <section className="border-y border-border/70 bg-white/45 px-4 py-16 md:py-24">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-display text-2xl md:text-3xl font-bold">
          {t("cta.title")}
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-md mx-auto">
          {t("cta.description")}
        </p>
        <div className="mt-8 flex justify-center">
          <Button
            onClick={() => navigate("/register")}
            className="rounded-full h-12 px-10 text-base font-semibold border-0 shadow-none active:scale-95 transition-transform gap-2 group"
          >
            {t("cta.button")}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
}
