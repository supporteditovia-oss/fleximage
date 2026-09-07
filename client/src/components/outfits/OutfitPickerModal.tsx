import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  getOutfitsByGender,
  OUTFIT_GENDER_LABELS,
  type BuiltinOutfit,
  type OutfitGender,
} from "@/lib/builtin-outfit-templates";
import "./outfit-picker.css";

type OutfitPickerModalProps = {
  open: boolean;
  title?: string;
  subtitle?: string;
  /** Onglet affiché à l'ouverture (défaut : hommes). */
  defaultGender?: OutfitGender;
  /** Demande « Es-tu sûr ? » avant onSelect (Modèles prêts). */
  requireConfirmation?: boolean;
  /** Fermer au clic sur le fond (désactivé sur Modèles pour éviter une génération involontaire). */
  closeOnOverlayClick?: boolean;
  onClose: () => void;
  onSelect: (outfit: BuiltinOutfit) => void;
};

export function OutfitPickerModal({
  open,
  title = "Choisir une tenue",
  subtitle = "L’image 2 sera utilisée comme référence de vêtements.",
  defaultGender = "men",
  requireConfirmation = false,
  closeOnOverlayClick = true,
  onClose,
  onSelect,
}: OutfitPickerModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gender, setGender] = useState<OutfitGender>(defaultGender);
  const [confirmOutfit, setConfirmOutfit] = useState<BuiltinOutfit | null>(null);

  const outfits = useMemo(() => getOutfitsByGender(gender), [gender]);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setConfirmOutfit(null);
      return;
    }
    setGender(defaultGender);
    document.documentElement.setAttribute("data-fullscreen-overlay", "true");
    document.body.setAttribute("data-fullscreen-overlay", "true");
    window.$crisp?.push(["do", "chat:hide"]);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (confirmOutfit) {
          setConfirmOutfit(null);
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
      if (!document.documentElement.classList.contains("luxeflexia-modeles-page")) {
        window.$crisp?.push(["do", "chat:show"]);
      }
      window.removeEventListener("keydown", onKey);
    };
  }, [confirmOutfit, defaultGender, open, onClose]);

  useEffect(() => {
    setSelectedId(null);
    setConfirmOutfit(null);
  }, [gender]);

  const handlePick = (outfit: BuiltinOutfit) => {
    setSelectedId(outfit.id);
    if (requireConfirmation) {
      setConfirmOutfit(outfit);
      return;
    }
    onSelect(outfit);
  };

  const handleConfirm = () => {
    if (!confirmOutfit) return;
    onSelect(confirmOutfit);
    setConfirmOutfit(null);
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
      onClick={closeOnOverlayClick ? onClose : undefined}
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

        <div className="outfit-picker-tabs" role="tablist" aria-label="Catalogue tenues">
          {(["men", "women"] as const).map((tab) => {
            const count = getOutfitsByGender(tab).length;
            const active = gender === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                className={`outfit-picker-tab${active ? " is-active" : ""}`}
                onClick={() => setGender(tab)}
              >
                {OUTFIT_GENDER_LABELS[tab]}
                <span className="outfit-picker-tab__count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="outfit-picker-scroll">
          {outfits.length === 0 ? (
            <p className="outfit-picker-empty">
              Aucune tenue dans ce catalogue pour le moment.
            </p>
          ) : (
            <div className="outfit-picker-grid" role="list">
              {outfits.map((outfit, index) => {
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
          )}
        </div>

        {confirmOutfit ? (
          <div className="outfit-picker-confirm" role="alertdialog" aria-modal="true">
            <div className="outfit-picker-confirm__panel">
              <p className="outfit-picker-confirm__eyebrow">Confirmer la tenue</p>
              <h3 className="outfit-picker-confirm__title">{confirmOutfit.name}</h3>
              <p className="outfit-picker-confirm__text">
                Es-tu sûr de choisir cette tenue ? La génération démarrera
                uniquement après confirmation.
              </p>
              <div className="outfit-picker-confirm__actions">
                <button
                  type="button"
                  className="outfit-picker-confirm__cancel"
                  onClick={() => {
                    setConfirmOutfit(null);
                    setSelectedId(null);
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="outfit-picker-confirm__ok"
                  onClick={handleConfirm}
                >
                  Oui, cette tenue
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
