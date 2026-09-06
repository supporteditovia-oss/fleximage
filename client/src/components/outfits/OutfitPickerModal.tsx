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

function OutfitConfirmDialog({
  outfit,
  onCancel,
  onConfirm,
}: {
  outfit: BuiltinOutfit;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return createPortal(
    <div
      className="outfit-confirm-overlay outfit-confirm-overlay--fullscreen"
      role="dialog"
      aria-modal="true"
      aria-label="Confirmer la tenue"
      onClick={onCancel}
    >
      <div
        className="outfit-confirm-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="outfit-confirm-preview">
          <img src={outfit.imagePath} alt={outfit.name} decoding="async" />
        </div>
        <h3 className="outfit-confirm-title">Confirmer cette tenue ?</h3>
        <p className="outfit-confirm-name">{outfit.name}</p>
        <p className="outfit-confirm-hint">
          Cette tenue sera appliquée à votre photo pour la génération. Cette
          action consomme un crédit — vérifiez votre choix avant de continuer.
        </p>
        <div className="outfit-question-actions">
          <button type="button" className="outfit-question-no" onClick={onCancel}>
            Non, annuler
          </button>
          <button type="button" className="outfit-question-yes" onClick={onConfirm}>
            Oui, confirmer
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function OutfitPickerModal({
  open,
  title = "Choisir une tenue",
  subtitle = "L’image 2 sera utilisée comme référence de vêtements.",
  onClose,
  onSelect,
}: OutfitPickerModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingOutfit, setPendingOutfit] = useState<BuiltinOutfit | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setPendingOutfit(null);
      return;
    }
    document.documentElement.setAttribute("data-fullscreen-overlay", "true");
    document.body.setAttribute("data-fullscreen-overlay", "true");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (pendingOutfit) {
          setPendingOutfit(null);
          setSelectedId(null);
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.removeAttribute("data-fullscreen-overlay");
      document.body.removeAttribute("data-fullscreen-overlay");
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, pendingOutfit]);

  const handlePick = (outfit: BuiltinOutfit) => {
    setSelectedId(outfit.id);
    setPendingOutfit(outfit);
  };

  const cancelConfirmation = () => {
    setPendingOutfit(null);
    setSelectedId(null);
  };

  const confirmSelection = () => {
    if (!pendingOutfit) return;
    const outfit = pendingOutfit;
    setPendingOutfit(null);
    setSelectedId(null);
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

  return (
    <>
      {createPortal(
        <div
          className="outfit-catalog-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={pendingOutfit ? undefined : onClose}
        >
          <div
            className="outfit-catalog-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="outfit-catalog-header">
              <div>
                <h2 className="outfit-catalog-title">{title}</h2>
                {subtitle ? (
                  <p className="outfit-catalog-subtitle">{subtitle}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="outfit-catalog-close"
                onClick={onClose}
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="outfit-catalog-scroll">
              <div className="outfit-catalog-gallery">
                {BUILTIN_OUTFITS.map((outfit, index) => {
                  const isSelected = selectedId === outfit.id;
                  return (
                    <div
                      key={outfit.id}
                      className={`outfit-catalog-card${isSelected ? " is-selected" : ""}`}
                      aria-pressed={isSelected}
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        handlePick(outfit);
                      }}
                      onKeyDown={(event) => onCardKeyDown(event, outfit)}
                    >
                      <div className="outfit-catalog-card__frame">
                        <img
                          src={outfit.imagePath}
                          alt={outfit.name}
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <p className="outfit-catalog-card__label">
                        <span className="outfit-catalog-card__index">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="outfit-catalog-card__name">{outfit.name}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {pendingOutfit ? (
        <OutfitConfirmDialog
          outfit={pendingOutfit}
          onCancel={cancelConfirmation}
          onConfirm={confirmSelection}
        />
      ) : null}
    </>
  );
}
