import { createPortal } from "react-dom";
import { useEffect } from "react";
import type { ResolvedSubjectType } from "@/lib/subject-pose-prompt";
import "./subject-pose-controls.css";

type SubjectAutoConfirmDialogProps = {
  open: boolean;
  detectedLabel: string;
  onConfirm: (resolved: ResolvedSubjectType) => void;
  onCancel: () => void;
};

const CHOICES: { value: ResolvedSubjectType; label: string }[] = [
  { value: "woman", label: "Femme" },
  { value: "man", label: "Homme" },
  { value: "unspecified", label: "Non spécifié" },
];

export function SubjectAutoConfirmDialog({
  open,
  detectedLabel,
  onConfirm,
  onCancel,
}: SubjectAutoConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="subject-auto-confirm-overlay" role="dialog" aria-modal="true">
      <div className="subject-auto-confirm-panel">
        <h2>Confirmer le sujet</h2>
        <p>
          Mode Auto : {detectedLabel}. Choisis le sujet pour adapter la pose
          sans stéréotypes.
        </p>
        <div className="subject-auto-confirm-actions">
          {CHOICES.map((choice) => (
            <button
              key={choice.value}
              type="button"
              className="subject-auto-confirm-btn"
              onClick={() => onConfirm(choice.value)}
            >
              {choice.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="subject-auto-confirm-cancel"
          onClick={onCancel}
        >
          Annuler
        </button>
      </div>
    </div>,
    document.body,
  );
}
