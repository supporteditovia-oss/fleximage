import {
  VIDEO_STUDIO_MODE_OPTIONS,
  type VideoStudioMode,
} from "@/lib/video-studio-modes";

type VideoStudioModePickerProps = {
  active: VideoStudioMode;
  onSelect: (mode: VideoStudioMode) => void;
  /** Texte sous la grille (optionnel). */
  intro?: string;
};

export function VideoStudioModePicker({
  active,
  onSelect,
  intro,
}: VideoStudioModePickerProps) {
  return (
    <div className="via-mode-picker">
      {intro ? <p className="via-mode-picker__intro">{intro}</p> : null}
      <div
        className="via-mode-grid via-mode-grid--triple"
        role="tablist"
        aria-label="Type de création vidéo"
      >
        {VIDEO_STUDIO_MODE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = active === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(option.id)}
              className={`via-mode-card ${isActive ? "is-active" : ""}`}
            >
              <span className="via-mode-card__icon" aria-hidden>
                <Icon className="h-4 w-4" />
              </span>
              <span className="via-mode-card__label">{option.label}</span>
              <span className="via-mode-card__hint">{option.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
