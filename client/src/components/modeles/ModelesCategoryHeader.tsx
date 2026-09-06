import { ChevronLeft } from "lucide-react";
import {
  formatSceneCount,
  getCategoryBySlug,
  type ModelesCategorySlug,
} from "@/lib/modeles-categories";
import "./modeles-catalog.css";

type ModelesCategoryHeaderProps = {
  category: ModelesCategorySlug;
  count: number;
  onBack: () => void;
};

export function ModelesCategoryHeader({
  category,
  count,
  onBack,
}: ModelesCategoryHeaderProps) {
  const meta = getCategoryBySlug(category);
  if (!meta) return null;

  return (
    <header className="mcatalog-category-header">
      <button
        type="button"
        className="mcatalog-category-header__back"
        onClick={onBack}
        aria-label="Retour au catalogue"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        <span>Catalogue</span>
      </button>
      <h2 className="mcatalog-category-header__title">
        {meta.emoji} {meta.label}
      </h2>
      <p className="mcatalog-category-header__count">{formatSceneCount(count)}</p>
      <p className="mcatalog-category-header__desc">{meta.description}</p>
    </header>
  );
}
