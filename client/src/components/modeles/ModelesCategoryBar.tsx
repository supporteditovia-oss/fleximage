import { MODELES_CATEGORIES, type ModelesCategorySlug } from "@/lib/modeles-categories";
import "./modeles-catalog.css";

type ModelesCategoryBarProps = {
  active: ModelesCategorySlug;
  counts: Partial<Record<ModelesCategorySlug, number>>;
  onChange: (slug: ModelesCategorySlug) => void;
};

export function ModelesCategoryBar({
  active,
  counts,
  onChange,
}: ModelesCategoryBarProps) {
  return (
    <div className="mcatalog-categories" role="tablist" aria-label="Catégories du catalogue">
      {MODELES_CATEGORIES.map((category) => {
        const count = counts[category.slug] ?? 0;
        const isActive = active === category.slug;
        return (
          <button
            key={category.slug}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`mcatalog-categories__chip${isActive ? " is-active" : ""}`}
            onClick={() => onChange(category.slug)}
          >
            <span>{category.label}</span>
            {count > 0 ? (
              <span className="mcatalog-categories__count" aria-hidden>
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
