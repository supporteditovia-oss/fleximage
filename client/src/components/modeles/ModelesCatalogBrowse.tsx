import type { FeedTemplate } from "@/hooks/use-template-feed";
import type { BuiltinOutfit } from "@/lib/builtin-outfit-templates";
import {
  MODELES_CATEGORIES,
  formatSceneCount,
  isOutfitCategory,
  normalizeSceneCategory,
  type ModelesCategorySlug,
} from "@/lib/modeles-categories";
import { ChevronRight } from "lucide-react";
import "./modeles-catalog.css";

type ModelesCatalogBrowseProps = {
  templates: FeedTemplate[];
  outfits: BuiltinOutfit[];
  onSelectScene: (template: FeedTemplate) => void;
  onSelectOutfit: (outfit: BuiltinOutfit) => void;
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
      <span className="mcatalog-rail-card__title">{template.name}</span>
    </button>
  );
}

function OutfitRailCard({
  outfit,
  onSelect,
}: {
  outfit: BuiltinOutfit;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="mcatalog-rail-card"
      onClick={onSelect}
      aria-label={outfit.name}
    >
      <img src={outfit.imagePath} alt="" loading="lazy" decoding="async" draggable={false} />
      <div className="mcatalog-rail-card__scrim" aria-hidden />
      <span className="mcatalog-rail-card__title">{outfit.name}</span>
    </button>
  );
}

export function ModelesCatalogBrowse({
  templates,
  outfits,
  onSelectScene,
  onSelectOutfit,
  onViewAllCategory,
}: ModelesCatalogBrowseProps) {
  return (
    <div className="mcatalog-browse">
      {MODELES_CATEGORIES.map((category) => {
        const scenes = isOutfitCategory(category.slug)
          ? []
          : templates.filter(
              (item) => normalizeSceneCategory(item.category) === category.slug,
            );
        const categoryOutfits = isOutfitCategory(category.slug) ? outfits : [];
        const count = isOutfitCategory(category.slug)
          ? categoryOutfits.length
          : scenes.length;

        if (count === 0) return null;

        return (
          <section key={category.slug} className="mcatalog-browse__section">
            <div className="mcatalog-browse__head">
              <h2 className="mcatalog-browse__title">
                {category.emoji} {category.label}
              </h2>
              <button
                type="button"
                className="mcatalog-browse__view-all"
                onClick={() => onViewAllCategory(category.slug)}
              >
                Voir tout
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <p className="mcatalog-browse__count">{formatSceneCount(count)}</p>
            <div className="mcatalog-browse__rail" role="list">
              {isOutfitCategory(category.slug)
                ? categoryOutfits.map((outfit) => (
                    <OutfitRailCard
                      key={outfit.id}
                      outfit={outfit}
                      onSelect={() => onSelectOutfit(outfit)}
                    />
                  ))
                : scenes.map((template) => (
                    <SceneRailCard
                      key={template.id}
                      template={template}
                      onSelect={() => onSelectScene(template)}
                    />
                  ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
