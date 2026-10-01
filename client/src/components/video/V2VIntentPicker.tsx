import {
  V2V_INTENT_OPTIONS,
  type V2VStudioIntent,
} from "@/lib/v2v-studio-intent";

type V2VIntentPickerProps = {
  active: V2VStudioIntent;
  onSelect: (intent: V2VStudioIntent) => void;
  variant?: "compact" | "cards";
};

export function V2VIntentPicker({
  active,
  onSelect,
  variant = "compact",
}: V2VIntentPickerProps) {
  if (variant === "cards") {
    return (
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
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="via-intent-segment"
      role="tablist"
      aria-label="Type de transformation"
    >
      {V2V_INTENT_OPTIONS.map((option) => {
        const isActive = active === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`via-intent-segment__btn ${isActive ? "is-active" : ""}`}
            onClick={() => onSelect(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
