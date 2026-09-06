import { useMemo } from "react";
import type { FeedTemplate } from "@/hooks/use-template-feed";
import type { ModelesCategorySlug } from "@/lib/modeles-categories";
import { Sparkles } from "lucide-react";
import "./modeles-catalog.css";

type ModelesCatalogGridProps = {
  items: FeedTemplate[];
  category: ModelesCategorySlug;
  onSelectScene: (template: FeedTemplate) => void;
};

function CatalogCard({
  template,
  index,
  onSelect,
}: {
  template: FeedTemplate;
  index: number;
  onSelect: () => void;
}) {
  const imageSrc = template.demoAfterUrl ?? template.previewUrl ?? "";
  const badge = template.categoryName ?? "Modèle";

  return (
    <button
      type="button"
      className="mcatalog-card"
      onClick={onSelect}
      aria-label={`Modèle — ${template.name}`}
    >
      <div className="mcatalog-card__photo">
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        <span className="mcatalog-card__badge">
          <Sparkles className="h-2.5 w-2.5" aria-hidden />
          {badge}
        </span>
      </div>
      <div className="mcatalog-card__meta">
        <span className="mcatalog-card__index">{String(index + 1).padStart(2, "0")}</span>
        <span className="mcatalog-card__name">{template.name}</span>
      </div>
    </button>
  );
}

export function ModelesCatalogGrid({
  items,
  category,
  onSelectScene,
}: ModelesCatalogGridProps) {
  const emptyMessage = useMemo(() => {
    if (items.length > 0) return null;
    return "Nouveaux modèles exclusifs LuxeFlexIA en cours de production pour cette catégorie.";
  }, [items.length]);

  if (emptyMessage) {
    return (
      <div className="mcatalog-empty">
        <p>{emptyMessage}</p>
        <p className="mcatalog-empty__note">
          100 % généré par LuxeFlexIA — aucune image externe.
        </p>
      </div>
    );
  }

  return (
    <div className="mcatalog-grid" role="list">
      {items.map((template, index) => (
        <CatalogCard
          key={template.id}
          template={template}
          index={index}
          onSelect={() => onSelectScene(template)}
        />
      ))}
    </div>
  );
}
