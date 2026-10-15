export type I2VAmbience = "none" | "street" | "crowd_protest";

type Props = {
  value: I2VAmbience;
  onChange: (value: I2VAmbience) => void;
  disabled?: boolean;
};

const OPTIONS: { value: I2VAmbience; label: string }[] = [
  { value: "none", label: "Aucune" },
  { value: "street", label: "Rue" },
  { value: "crowd_protest", label: "Foule / manifestation" },
];

export function VideoI2VAmbienceSelect({ value, onChange, disabled }: Props) {
  return (
    <div className="via-voice-addon">
      <p className="via-step-label">Ambiance sonore</p>
      <p className="via-voice-addon__hint via-voice-addon__hint--panel">
        Arrière-plan discret sous ta voix.
      </p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              value === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
            }`}
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
