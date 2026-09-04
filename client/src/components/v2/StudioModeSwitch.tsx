import { cn } from "@/lib/utils";
import type { StudioMode } from "@/lib/v2-experience";

type StudioModeSwitchProps = {
  mode: StudioMode;
  onChange: (mode: StudioMode) => void;
  className?: string;
  size?: "default" | "compact";
};

export function StudioModeSwitch({
  mode,
  onChange,
  className,
  size = "default",
}: StudioModeSwitchProps) {
  return (
    <div
      className={cn(
        "lx-studio-switch inline-flex rounded-full border border-[var(--lx-ink)]/10 bg-white/60 p-0.5",
        size === "compact" ? "text-xs" : "text-sm",
        className,
      )}
      role="tablist"
      aria-label="Mode du studio"
    >
      {(
        [
          { id: "image" as const, label: "Image IA" },
          { id: "voice" as const, label: "Voix IA" },
        ] as const
      ).map((item) => {
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              "rounded-full font-medium transition-all duration-300 ease-out",
              size === "compact" ? "px-3.5 py-1.5" : "px-5 py-2",
              active
                ? "bg-[var(--lx-ink)] text-[var(--lx-surface-2)]"
                : "text-[var(--lx-muted)] hover:text-[var(--lx-ink)]",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
