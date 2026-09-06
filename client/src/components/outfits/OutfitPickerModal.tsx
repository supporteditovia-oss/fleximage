import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { BUILTIN_OUTFITS, type BuiltinOutfit } from "@/lib/builtin-outfit-templates";
import "./outfit-picker.css";

type OutfitPickerModalProps = {
  open: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onSelect: (outfit: BuiltinOutfit) => void;
};

export function OutfitPickerModal({
  open,
  title = "Choisir une tenue",
  subtitle = "L’image 2 sera utilisée comme référence de vêtements.",
  onClose,
  onSelect,
}: OutfitPickerModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      return;
    }
    document.documentElement.setAttribute("data-fullscreen-overlay", "true");
    document.body.setAttribute("data-fullscreen-overlay", "true");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.removeAttribute("data-fullscreen-overlay");
      document.body.removeAttribute("data-fullscreen-overlay");
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const handlePick = (outfit: BuiltinOutfit) => {
    setSelectedId(outfit.id);
    onSelect(outfit);
  };

  const onCardKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    outfit: BuiltinOutfit,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handlePick(outfit);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="outfit-picker-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="outfit-picker-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="outfit-picker-header">
          <div>
            <h2 className="outfit-picker-title">{title}</h2>
            {subtitle ? (
              <p className="outfit-picker-subtitle">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="outfit-picker-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="outfit-picker-scroll">
          <div className="outfit-picker-grid" role="list">
            {BUILTIN_OUTFITS.map((outfit, index) => {
              const isSelected = selectedId === outfit.id;
              return (
                <div
                  key={outfit.id}
                  role="listitem"
                  className={`outfit-picker-card${isSelected ? " is-selected" : ""}`}
                  aria-pressed={isSelected}
                  tabIndex={0}
                  onClick={() => handlePick(outfit)}
                  onKeyDown={(event) => onCardKeyDown(event, outfit)}
                >
                  <div className="outfit-picker-card__photo">
                    <img
                      src={outfit.imagePath}
                      alt={outfit.name}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <p className="outfit-picker-card__label">
                    <span className="outfit-picker-card__index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="outfit-picker-card__name">{outfit.name}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
