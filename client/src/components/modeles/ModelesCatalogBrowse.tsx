import type { FeedTemplate } from "@/hooks/use-template-feed";
import {
  getCatalogCategories,
  formatSceneCount,
  normalizeSceneCategory,
  type ModelesCategorySlug,
} from "@/lib/modeles-categories";
import { ChevronRight, Sparkles } from "lucide-react";
import "./modeles-catalog.css";

type ModelesCatalogBrowseProps = {
  templates: FeedTemplate[];
  onSelectScene: (template: FeedTemplate) => void;
  onViewAllCategory: (slug: ModelesCategorySlug) => void;
};

function SceneRailCard({
  template,
  onSelect,
}: {
  template: FeedTemplate;
  onSelect: () => void;
}) {
  const imageSrc = template.demoAfterUrl ?? template.previewUrl ?? "";

  return (
    <button
      type="button"
      className="mcatalog-rail-card"
      onClick={onSelect}
      aria-label={template.name}
    >
      <img src={imageSrc} alt="" loading="lazy" decoding="async" draggable={false} />
      <div className="mcatalog-rail-card__scrim" aria-hidden />
      <span className="mcatalog-rail-card__badge">
        <Sparkles className="h-2.5 w-2.5" aria-hidden />
        Exclusive
      </span>
      <span className="mcatalog-rail-card__title">{template.name}</span>
    </button>
  );
}

export function ModelesCatalogBrowse({
  templates,
  onSelectScene,
  onViewAllCategory,
}: ModelesCatalogBrowseProps) {
  return (
    <div className="mcatalog-browse">
      {getCatalogCategories().map((category) => {
        const scenes = templates.filter(
          (item) => normalizeSceneCategory(item.category) === category.slug,
        );
        if (scenes.length === 0) return null;

        return (
          <section key={category.slug} className="mcatalog-browse__section">
            <div className="mcatalog-browse__head">
              <div className="mcatalog-browse__title-wrap">
                <span className="mcatalog-browse__emoji" aria-hidden>
                  {category.emoji}
                </span>
                <div>
                  <h2 className="mcatalog-browse__title">{category.label}</h2>
                  <p className="mcatalog-browse__count">
                    {formatSceneCount(scenes.length)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="mcatalog-browse__view-all"
                onClick={() => onViewAllCategory(category.slug)}
              >
                Voir tout
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
            <div className="mcatalog-browse__rail-wrap">
              <div className="mcatalog-browse__rail" role="list">
                {scenes.map((template) => (
                  <SceneRailCard
                    key={template.id}
                    template={template}
                    onSelect={() => onSelectScene(template)}
                  />
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
