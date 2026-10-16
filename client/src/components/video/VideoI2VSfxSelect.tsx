import {
  I2V_SFX_MOMENT_OPTIONS,
  I2V_SFX_OPTIONS,
  type I2VSfx,
  type I2VSfxMoment,
} from "@shared/i2v-sfx";

type Props = {
  sfx: I2VSfx;
  onSfxChange: (value: I2VSfx) => void;
  moment: I2VSfxMoment;
  onMomentChange: (value: I2VSfxMoment) => void;
  disabled?: boolean;
};

export function VideoI2VSfxSelect({
  sfx,
  onSfxChange,
  moment,
  onMomentChange,
  disabled,
}: Props) {
  return (
    <div className="via-voice-addon mt-3">
      <p className="via-step-label">Effet sonore</p>
      <p className="via-voice-addon__hint via-voice-addon__hint--panel">
        Un effet ponctuel calé sur l&apos;action.
      </p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {I2V_SFX_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              sfx === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
            }`}
            onClick={() => onSfxChange(opt.value)}
            aria-pressed={sfx === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {sfx !== "none" ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            Moment
          </p>
          <div className="flex flex-wrap gap-1.5">
            {I2V_SFX_MOMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  moment === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                }`}
                onClick={() => onMomentChange(opt.value)}
                aria-pressed={moment === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
