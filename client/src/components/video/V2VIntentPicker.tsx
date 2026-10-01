import {
  V2V_INTENT_OPTIONS,
  type V2VStudioIntent,
} from "@/lib/v2v-studio-intent";

type V2VIntentPickerProps = {
  active: V2VStudioIntent;
  onSelect: (intent: V2VStudioIntent) => void;
};

export function V2VIntentPicker({ active, onSelect }: V2VIntentPickerProps) {
  return (
    <div className="via-intent-block">
      <p className="via-option-block__label">Type de transformation</p>
      <p className="via-intent-block__lead">
        Choisis ton intention — le studio sélectionne le moteur cinéma adapté.
        Tu n&apos;as pas à connaître la technique.
      </p>
      <div
        className="via-intent-grid"
        role="tablist"
        aria-label="Intention Vidéo vers Vidéo"
      >
        {V2V_INTENT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = active === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`via-intent-card ${isActive ? "is-active" : ""}`}
              onClick={() => onSelect(option.id)}
            >
              <span className="via-intent-card__icon" aria-hidden>
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="via-intent-card__label">{option.label}</span>
              <span className="via-intent-card__hint">{option.hint}</span>
              <span className="via-intent-card__detail">{option.detail}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
