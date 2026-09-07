import { useLocation } from "wouter";
import { ChevronRight, Sparkles } from "lucide-react";
import { useTemplateFeed } from "@/hooks/use-template-feed";
import { useAdminPreviewFeatures } from "@/lib/admin-preview-features";
import { MODELES_CATALOG_PATH } from "@/lib/modeles-categories";
import "@/pages/modeles-page.css";

type TemplateStripProps = {
  /** compact = une ligne discrète sous le formulaire ; full = carte avec vignettes */
  variant?: "compact" | "full";
};

/**
 * Entrée permanente vers les modèles depuis le studio Image IA (admin preview).
 */
export function TemplateStrip({ variant = "compact" }: TemplateStripProps) {
  const [, navigate] = useLocation();
  const adminPreview = useAdminPreviewFeatures();
  const { data: templates } = useTemplateFeed({
    enabled: adminPreview,
  });

  if (!adminPreview) {
    return null;
  }

  const list = templates ?? [];

  if (list.length === 0) {
    return null;
  }

  if (variant === "compact") {
    return (
      <section
        className="tpl-strip-compact"
        aria-label="Modèles prêts à l'emploi"
      >
        <button
          type="button"
          className="tpl-strip-compact__main"
          onClick={() => navigate(MODELES_CATALOG_PATH)}
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
              onClick={() => navigate(MODELES_CATALOG_PATH)}
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
        onClick={() => navigate(MODELES_CATALOG_PATH)}
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
            onClick={() => navigate(MODELES_CATALOG_PATH)}
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
