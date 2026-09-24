import { createPortal } from "react-dom";
import { ChevronLeft, X } from "lucide-react";
import { BUILTIN_FEED_TEMPLATES } from "@/lib/builtin-image-templates";
import {
  modelesCategoryPath,
  modelesDetailPath,
  type ModelesCategorySlug,
} from "@/lib/modeles-categories";
import { ModelesCatalogBrowse } from "@/components/modeles/ModelesCatalogBrowse";
import type { FeedTemplate } from "@/hooks/use-template-feed";
import "@/components/modeles/modeles-catalog.css";
import "./modeles-ready-overlay.css";

type ModelesReadyCatalogOverlayProps = {
  open: boolean;
  onClose: () => void;
  templates?: FeedTemplate[];
};

/**
 * Catalogue « Modèles prêts » en plein écran — depuis Créer, sans dépendre de /modeles seul.
 */
export function ModelesReadyCatalogOverlay({
  open,
  onClose,
  templates = BUILTIN_FEED_TEMPLATES,
}: ModelesReadyCatalogOverlayProps) {
  if (!open) return null;

  const goDetail = (template: FeedTemplate) => {
    window.location.assign(modelesDetailPath(template));
  };

  const goCategory = (slug: ModelesCategorySlug) => {
    window.location.assign(modelesCategoryPath(slug));
  };

  const goFullPage = () => {
    window.location.assign("/modeles");
  };

  return createPortal(
    <div className="modeles-ready-overlay" role="dialog" aria-modal="true" aria-label="Modèles prêts">
      <div className="modeles-ready-overlay__panel mcatalog-page">
        <div className="modeles-ready-overlay__top">
          <button type="button" className="tpl-round-button" onClick={onClose} aria-label="Fermer">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="modeles-ready-overlay__titles">
            <p className="mcatalog-header__eyebrow">Collection exclusive</p>
            <h2 className="mcatalog-header__title">Modèles prêts</h2>
          </div>
          <button type="button" className="modeles-ready-overlay__close" onClick={onClose} aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="modeles-ready-overlay__scroll mcatalog-scroll">
          <p className="modeles-ready-overlay__hint">
            {templates.length} scènes — choisis une vignette pour te mettre en image.
          </p>
          <ModelesCatalogBrowse
            templates={templates}
            onSelectScene={goDetail}
            onViewAllCategory={goCategory}
          />
          <button type="button" className="modeles-ready-overlay__fullpage" onClick={goFullPage}>
            Ouvrir en plein écran
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
