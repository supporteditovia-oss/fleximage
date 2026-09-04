import { useLocation } from "wouter";
import { ChevronRight, Sparkles } from "lucide-react";
import { useTemplateFeed } from "@/hooks/use-template-feed";
import "@/pages/modeles-page.css";

/**
 * Point d'entrée vers les modèles depuis le studio Image IA.
 * Une bande horizontale d'aperçus : on voit tout de suite qu'il existe des
 * scènes prêtes à l'emploi, et n'importe quelle vignette ouvre le fil plein
 * écran directement sur le bon modèle.
 */
export function TemplateStrip() {
  const [, navigate] = useLocation();
  const { data: templates, isLoading } = useTemplateFeed();

  if (isLoading || !templates || templates.length === 0) return null;

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
        {templates.slice(0, 12).map((template) => (
          <button
            key={template.id}
            type="button"
            className="tpl-strip-entry__card"
            onClick={() => navigate(`/modeles?t=${template.id}`)}
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
