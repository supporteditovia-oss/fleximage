import { cn } from "@/lib/utils";
import { mockWaveformBars } from "@/lib/v2-mock-voice";

type MockWaveformProps = {
  seed?: number;
  active?: boolean;
  className?: string;
  barCount?: number;
  compact?: boolean;
};

export function MockWaveform({
  seed = 1,
  active = false,
  className,
  barCount = 32,
  compact = false,
}: MockWaveformProps) {
  const bars = mockWaveformBars(seed, barCount);

  return (
    <div
      className={cn(
        "flex items-end justify-center gap-[2px] rounded-lg bg-[var(--lx-surface)]/80 px-3 py-2",
        compact ? "h-9" : "h-11",
        className,
      )}
      aria-hidden
    >
      {bars.map((height, index) => (
        <span
          key={index}
          className={cn(
            "w-[2px] rounded-full transition-colors duration-300",
            active ? "bg-[var(--lx-gold)]/85" : "bg-[var(--lx-ink)]/14",
          )}
          style={{ height: `${Math.round(height * (compact ? 70 : 85))}%` }}
        />
      ))}
    </div>
  );
}
