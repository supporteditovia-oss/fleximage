import { useMemo } from "react";
import type { FeedTemplate } from "@/hooks/use-template-feed";
import type { BuiltinOutfit } from "@/lib/builtin-outfit-templates";
import type { ModelesCategorySlug } from "@/lib/modeles-categories";
import "./modeles-catalog.css";

export type CatalogGridItem =
  | { kind: "scene"; template: FeedTemplate }
  | { kind: "outfit"; outfit: BuiltinOutfit };

type ModelesCatalogGridProps = {
  items: CatalogGridItem[];
  category: ModelesCategorySlug;
  onSelectScene: (template: FeedTemplate) => void;
  onSelectOutfit?: (outfit: BuiltinOutfit) => void;
};

function CatalogCard({
  item,
  index,
  onSelect,
}: {
  item: CatalogGridItem;
  index: number;
  onSelect: () => void;
}) {
  const isOutfit = item.kind === "outfit";
  const name = isOutfit ? item.outfit.name : item.template.name;
  const imageSrc = isOutfit
    ? item.outfit.imagePath
    : (item.template.demoAfterUrl ?? item.template.previewUrl ?? "");
  const badge = isOutfit
    ? "Tenue"
    : (item.template.categoryName ?? "Modèle");

  return (
    <button
      type="button"
      className="mcatalog-card"
      onClick={onSelect}
      aria-label={`${isOutfit ? "Tenue" : "Modèle"} — ${name}`}
    >
      <div className="mcatalog-card__photo">
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        <span className="mcatalog-card__badge">{badge}</span>
      </div>
      <div className="mcatalog-card__meta">
        <span className="mcatalog-card__index">{String(index + 1).padStart(2, "0")}</span>
        <span className="mcatalog-card__name">{name}</span>
      </div>
    </button>
  );
}

export function ModelesCatalogGrid({
  items,
  category,
  onSelectScene,
  onSelectOutfit,
}: ModelesCatalogGridProps) {
  const emptyMessage = useMemo(() => {
    if (items.length > 0) return null;
    if (category === "outfits") {
      return "Les tenues exclusives LuxeFlexIA arrivent bientôt dans cette section.";
    }
    return "Nouveaux modèles exclusifs LuxeFlexIA en cours de production pour cette catégorie.";
  }, [category, items.length]);

  if (emptyMessage) {
    return (
      <div className="mcatalog-empty">
        <p>{emptyMessage}</p>
        <p className="mcatalog-empty__note">
          100 % généré par LuxeFlexIA — aucune image Pinterest, Google ou externe.
        </p>
      </div>
    );
  }

  return (
    <div className="mcatalog-grid" role="list">
      {items.map((item, index) => (
        <CatalogCard
          key={item.kind === "outfit" ? item.outfit.id : item.template.id}
          item={item}
          index={index}
          onSelect={() => {
            if (item.kind === "outfit") {
              onSelectOutfit?.(item.outfit);
            } else {
              onSelectScene(item.template);
            }
          }}
        />
      ))}
    </div>
  );
}
