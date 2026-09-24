import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, X } from "lucide-react";
import { BUILTIN_FEED_TEMPLATES } from "@/lib/builtin-image-templates";
import {
  filterScenesByCategory,
  getCategoryBySlug,
  modelesDetailPath,
  type ModelesCategorySlug,
} from "@/lib/modeles-categories";
import { ModelesCatalogBrowse } from "@/components/modeles/ModelesCatalogBrowse";
import { ModelesCatalogGrid } from "@/components/modeles/ModelesCatalogGrid";
import type { FeedTemplate } from "@/hooks/use-template-feed";
import "@/components/modeles/modeles-catalog.css";
import "./modeles-ready-overlay.css";

type ModelesReadyCatalogOverlayProps = {
  open: boolean;
  onClose: () => void;
  templates?: FeedTemplate[];
};

type OverlayView =
  | { mode: "home" }
  | { mode: "category"; slug: ModelesCategorySlug };

/**
 * Catalogue « Modèles prêts » plein écran — depuis Créer, navigation catégorie sans rechargement.
 */
export function ModelesReadyCatalogOverlay({
  open,
  onClose,
  templates = BUILTIN_FEED_TEMPLATES,
}: ModelesReadyCatalogOverlayProps) {
  const [view, setView] = useState<OverlayView>({ mode: "home" });

  useEffect(() => {
    if (!open) setView({ mode: "home" });
  }, [open]);

  const categoryItems = useMemo(() => {
    if (view.mode !== "category") return [];
    return filterScenesByCategory(templates, view.slug);
  }, [templates, view]);

  if (!open) return null;

  const goDetail = (template: FeedTemplate) => {
    window.location.assign(modelesDetailPath(template));
  };

  const openCategory = (slug: ModelesCategorySlug) => {
    setView({ mode: "category", slug });
  };

  const goBack = () => {
    if (view.mode === "category") {
      setView({ mode: "home" });
      return;
    }
    onClose();
  };

  const activeCategoryMeta =
    view.mode === "category" ? getCategoryBySlug(view.slug) : undefined;

  return createPortal(
    <div
      className="modeles-ready-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Modèles prêts"
    >
      <div className="modeles-ready-overlay__panel mcatalog-page">
        <div className="modeles-ready-overlay__top">
          <button
            type="button"
            className="tpl-round-button"
            onClick={goBack}
            aria-label={view.mode === "category" ? "Retour au catalogue" : "Fermer"}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="modeles-ready-overlay__titles">
            {view.mode === "home" ? (
              <>
                <p className="mcatalog-header__eyebrow">Collection exclusive</p>
                <h2 className="mcatalog-header__title">Modèles prêts</h2>
              </>
            ) : (
              <>
                <p className="mcatalog-header__eyebrow">
                  {activeCategoryMeta?.emoji ?? "✨"}
                </p>
                <h2 className="mcatalog-header__title">
                  {activeCategoryMeta?.label ?? "Catégorie"}
                </h2>
              </>
            )}
          </div>
          <button
            type="button"
            className="modeles-ready-overlay__close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="modeles-ready-overlay__scroll mcatalog-scroll">
          {view.mode === "home" ? (
            <>
              <p className="modeles-ready-overlay__hint">
                {templates.length} scènes — choisis une vignette pour te mettre en image.
              </p>
              <ModelesCatalogBrowse
                templates={templates}
                onSelectScene={goDetail}
                onViewAllCategory={openCategory}
              />
            </>
          ) : (
            <div className="mcatalog-body">
              {activeCategoryMeta ? (
                <p className="modeles-ready-overlay__hint">
                  {activeCategoryMeta.description}
                </p>
              ) : null}
              <ModelesCatalogGrid
                items={categoryItems}
                category={view.slug}
                onSelectScene={goDetail}
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
