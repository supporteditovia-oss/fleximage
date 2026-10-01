import {
  VIDEO_STUDIO_MODE_OPTIONS,
  type VideoStudioMode,
} from "@/lib/video-studio-modes";

type VideoStudioModePickerProps = {
  active: VideoStudioMode;
  onSelect: (mode: VideoStudioMode) => void;
  /** @deprecated compact par défaut — ignoré */
  intro?: string;
  variant?: "compact" | "cards";
};

export function VideoStudioModePicker({
  active,
  onSelect,
  variant = "compact",
}: VideoStudioModePickerProps) {
  if (variant === "cards") {
    return (
      <div
        className="via-mode-grid via-mode-grid--studio"
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
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="via-mode-segment"
      role="tablist"
      aria-label="Type de création vidéo"
    >
      {VIDEO_STUDIO_MODE_OPTIONS.map((option) => {
        const isActive = active === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(option.id)}
            className={`via-mode-segment__btn ${isActive ? "is-active" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
