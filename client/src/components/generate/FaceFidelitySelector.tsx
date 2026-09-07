import { useTranslation } from "react-i18next";
import type { FaceFidelityLevel } from "@shared/image-reference-roles";
import "./face-fidelity.css";

interface FaceFidelitySelectorProps {
  value: FaceFidelityLevel;
  onChange: (value: FaceFidelityLevel) => void;
  disabled?: boolean;
}

const LEVELS: FaceFidelityLevel[] = ["standard", "elevated", "maximum"];

export function FaceFidelitySelector({
  value,
  onChange,
  disabled = false,
}: FaceFidelitySelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="lx-face-fidelity" aria-labelledby="lx-face-fidelity-label">
      <p id="lx-face-fidelity-label" className="lx-face-fidelity__label">
        {t("imageUpload.faceFidelityLabel")}
      </p>
      <div className="lx-face-fidelity__options" role="radiogroup">
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={value === level}
            disabled={disabled}
            className={`lx-face-fidelity__option${value === level ? " is-active" : ""}`}
            onClick={() => onChange(level)}
          >
            {t(`imageUpload.faceFidelity.${level}`)}
          </button>
        ))}
      </div>
      <p className="lx-face-fidelity__hint">{t("imageUpload.identityPhotoHint")}</p>
    </div>
  );
}
