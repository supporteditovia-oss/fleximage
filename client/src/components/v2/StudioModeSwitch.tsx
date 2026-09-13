import { cn } from "@/lib/utils";
import type { StudioMode } from "@/lib/v2-experience";
import { useTranslation } from "react-i18next";
import "./studio-mode-switch.css";

type StudioModeSwitchProps = {
  mode: StudioMode;
  onChange: (mode: StudioMode) => void;
  className?: string;
  size?: "default" | "compact";
};

const STUDIO_MODES: { id: StudioMode; labelKey: string; emoji: string }[] = [
  { id: "image", labelKey: "landing:studio.image", emoji: "🖼️" },
  { id: "voice", labelKey: "landing:studio.voice", emoji: "🎙️" },
  { id: "video", labelKey: "landing:studio.video", emoji: "🎬" },
];

export function StudioModeSwitch({
  mode,
  onChange,
  className,
  size = "default",
}: StudioModeSwitchProps) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "lx-studio-switch",
        size === "default" && "lx-studio-switch--default",
        className,
      )}
      role="tablist"
      aria-label={t("landing:studio.modesAria")}
    >
      <div className="lx-studio-switch__indicator" data-mode={mode} aria-hidden />
      {STUDIO_MODES.map((item) => {
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              "lx-studio-switch__btn",
              size === "compact"
                ? "lx-studio-switch__btn--compact"
                : "lx-studio-switch__btn--default",
            )}
          >
            <span className="lx-studio-switch__emoji" aria-hidden>
              {item.emoji}
            </span>
            {t(item.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
