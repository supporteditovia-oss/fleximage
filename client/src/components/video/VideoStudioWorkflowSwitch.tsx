import {
  VIDEO_STUDIO_MODE_OPTIONS,
  type VideoStudioMode,
} from "@/lib/video-studio-modes";
import "@/components/v2/studio-mode-switch.css";

type Props = {
  active: VideoStudioMode;
  onSelect: (mode: VideoStudioMode) => void;
};

/** Segmented control 2 onglets — même langage que lx-studio-switch. */
export function VideoStudioWorkflowSwitch({ active, onSelect }: Props) {
  const duoIndex = active === "video_to_video" ? 1 : 0;
  return (
    <div
      className="lx-studio-switch lx-studio-switch--duo"
      role="tablist"
      aria-label="Workflow vidéo"
    >
      <div
        className="lx-studio-switch__indicator"
        data-duo-index={duoIndex}
        aria-hidden
      />
      {VIDEO_STUDIO_MODE_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={active === option.id}
          className="lx-studio-switch__btn lx-studio-switch__btn--default"
          onClick={() => onSelect(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
