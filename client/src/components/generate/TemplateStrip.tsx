import { useLocation } from "wouter";
import { ChevronRight, Sparkles } from "lucide-react";
import { useTemplateFeed } from "@/hooks/use-template-feed";
import { BUILTIN_FEED_TEMPLATES } from "@/lib/builtin-image-templates";
import "@/pages/modeles-page.css";

type TemplateStripProps = {
  /** compact = une ligne discrète sous le formulaire ; full = carte avec vignettes */
  variant?: "compact" | "full";
};

/**
 * Entrée permanente vers les modèles depuis le studio Image IA.
 */
export function TemplateStrip({ variant = "compact" }: TemplateStripProps) {
  const [, navigate] = useLocation();
  const { data: templates } = useTemplateFeed();
  const list = templates?.length ? templates : BUILTIN_FEED_TEMPLATES;

  if (variant === "compact") {
    return (
      <section
        className="tpl-strip-compact"
        aria-label="Modèles prêts à l'emploi"
      >
        <button
          type="button"
          className="tpl-strip-compact__main"
          onClick={() => navigate("/modeles")}
        >
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
          <span className="tpl-strip-compact__label">Modèles prêts</span>
          <span className="tpl-strip-compact__count">{list.length} scènes</span>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
        </button>

        <div className="tpl-strip-compact__rail" aria-hidden>
          {list.slice(0, 5).map((template) => (
            <button
              key={template.id}
              type="button"
              className="tpl-strip-compact__thumb"
              onClick={() => navigate("/modeles")}
              aria-label={template.name}
            >
              <img src={template.previewUrl ?? ""} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="tpl-strip-entry" aria-label="Modèles prêts à l'emploi">
      <button
        type="button"
        className="tpl-strip-entry__head"
        onClick={() => navigate("/modeles")}
      >
        <span className="tpl-strip-entry__title">
          <Sparkles className="h-4 w-4" aria-hidden />
          Modèles prêts
        </span>
        <span className="tpl-strip-entry__all">
          Tout voir
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      </button>

      <p className="tpl-strip-entry__sub">
        Choisis une scène, ajoute ta photo, tu remplaces la personne.
      </p>

      <div className="tpl-strip-entry__rail">
        {list.slice(0, 12).map((template) => (
          <button
            key={template.id}
            type="button"
            className="tpl-strip-entry__card"
            onClick={() => navigate("/modeles")}
            aria-label={template.name}
          >
            <img src={template.previewUrl ?? ""} alt="" loading="lazy" />
            <span className="tpl-strip-entry__name">{template.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
