import {
  MODELES_CATEGORIES,
  formatSceneCount,
  type ModelesCategorySlug,
} from "@/lib/modeles-categories";
import "./modeles-catalog.css";

type CategoryCover = {
  slug: ModelesCategorySlug;
  count: number;
  coverUrl: string;
};

type ModelesCategoryHomeProps = {
  covers: CategoryCover[];
  onSelectCategory: (slug: ModelesCategorySlug) => void;
};

export function ModelesCategoryHome({
  covers,
  onSelectCategory,
}: ModelesCategoryHomeProps) {
  const coverMap = new Map(covers.map((item) => [item.slug, item]));

  return (
    <div className="mcatalog-home-grid" role="list">
      {MODELES_CATEGORIES.map((category) => {
        const meta = coverMap.get(category.slug);
        const count = meta?.count ?? 0;
        const coverUrl = meta?.coverUrl ?? category.coverImagePath;

        return (
          <button
            key={category.slug}
            type="button"
            className="mcatalog-home-card"
            role="listitem"
            onClick={() => onSelectCategory(category.slug)}
            aria-label={`${category.emoji} ${category.label} — ${formatSceneCount(count)}`}
          >
            <div className="mcatalog-home-card__photo">
              <img
                src={coverUrl}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
              />
              <div className="mcatalog-home-card__scrim" aria-hidden />
              <span className="mcatalog-home-card__emoji" aria-hidden>
                {category.emoji}
              </span>
            </div>
            <div className="mcatalog-home-card__meta">
              <span className="mcatalog-home-card__title">
                {category.emoji} {category.label}
              </span>
              <span className="mcatalog-home-card__count">
                {formatSceneCount(count)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
