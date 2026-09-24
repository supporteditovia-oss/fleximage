import { useCallback } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { useTemplateFeed } from "@/hooks/use-template-feed";
import { BUILTIN_FEED_TEMPLATES } from "@/lib/builtin-image-templates";
import { useAdminPreviewFeatures } from "@/lib/admin-preview-features";
import { useAuth } from "@/hooks/use-auth";
import { useV2Access } from "@/hooks/use-v2-access";
import { MODELES_CATALOG_PATH } from "@/lib/modeles-categories";
import "./template-strip.css";

type TemplateStripProps = {
  /** compact = une ligne discrète sous le formulaire ; full = carte avec vignettes */
  variant?: "compact" | "full";
};

/**
 * Entrée permanente vers les modèles depuis le studio Image IA (admin preview).
 */
export function TemplateStrip({ variant = "compact" }: TemplateStripProps) {
  const { isAdmin } = useAuth();
  const { isAdmin: v2Admin } = useV2Access();
  const adminPreview = useAdminPreviewFeatures();
  const canAccess = isAdmin || v2Admin || adminPreview;
  const { data: templates } = useTemplateFeed({
    enabled: canAccess,
    alwaysIncludeBuiltins: true,
  });

  const openCatalog = useCallback(() => {
    window.location.assign(MODELES_CATALOG_PATH);
  }, []);

  if (!canAccess) {
    return null;
  }

  const list =
    templates && templates.length > 0 ? templates : BUILTIN_FEED_TEMPLATES;

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
          onClick={openCatalog}
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
              onClick={openCatalog}
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
        onClick={openCatalog}
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
            onClick={openCatalog}
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
