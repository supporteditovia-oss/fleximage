import { createPortal } from "react-dom";
import { useEffect } from "react";
import "@/components/outfits/outfit-picker.css";

type OutfitChangeQuestionProps = {
  open: boolean;
  onYes: () => void;
  onNo: () => void;
};

export function OutfitChangeQuestion({
  open,
  onYes,
  onNo,
}: OutfitChangeQuestionProps) {
  useEffect(() => {
    if (!open) return;
    document.documentElement.setAttribute("data-fullscreen-overlay", "true");
    document.body.setAttribute("data-fullscreen-overlay", "true");
    return () => {
      document.documentElement.removeAttribute("data-fullscreen-overlay");
      document.body.removeAttribute("data-fullscreen-overlay");
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="outfit-question-overlay" role="dialog" aria-modal="true">
      <div className="outfit-question-panel">
        <h2>Changer de tenue ?</h2>
        <p>
          Ta photo remplace le personnage du modèle. Tu peux garder sa tenue
          d&apos;origine, ou en choisir une autre dans le catalogue.
        </p>
        <div className="outfit-question-actions">
          <button type="button" className="outfit-question-no" onClick={onNo}>
            Non — garder la tenue du modèle
          </button>
          <button type="button" className="outfit-question-yes" onClick={onYes}>
            Oui — choisir une tenue
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
