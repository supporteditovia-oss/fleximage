import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { I2VAmbience } from "@/components/video/VideoI2VAmbienceSelect";
import { VideoI2VAmbienceSelect } from "@/components/video/VideoI2VAmbienceSelect";
import { VideoI2VSfxSelect } from "@/components/video/VideoI2VSfxSelect";
import type { I2VSfx, I2VSfxMoment } from "@shared/i2v-sfx";

type Props = {
  soundAutoOn: boolean;
  onSoundAutoOnChange: (on: boolean) => void;
  onManualAdjust: () => void;
  detectLabel: string | null;
  detectPending: boolean;
  i2vAmbience: I2VAmbience;
  onI2vAmbience: (v: I2VAmbience) => void;
  i2vSfx: I2VSfx;
  onI2vSfx: (v: I2VSfx) => void;
  i2vSfxMoment: I2VSfxMoment;
  onI2vSfxMoment: (v: I2VSfxMoment) => void;
  disabled?: boolean;
};

export function VideoI2VSoundAutoControls({
  soundAutoOn,
  onSoundAutoOnChange,
  onManualAdjust,
  detectLabel,
  detectPending,
  i2vAmbience,
  onI2vAmbience,
  i2vSfx,
  onI2vSfx,
  i2vSfxMoment,
  onI2vSfxMoment,
  disabled,
}: Props) {
  const [customOpen, setCustomOpen] = useState(false);

  useEffect(() => {
    if (soundAutoOn) setCustomOpen(false);
    else setCustomOpen(true);
  }, [soundAutoOn]);

  const autoSummary = detectPending
    ? "Analyse de la scène…"
    : detectLabel?.trim() || "Aucun son";

  const panelExpanded = !soundAutoOn || customOpen;

  const wrapManualChange =
    <T,>(fn: (v: T) => void) =>
    (v: T) => {
      if (soundAutoOn) onManualAdjust();
      fn(v);
    };

  return (
    <div className="via-i2v-sound mt-3 border-t border-border/40 pt-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="via-step-label mb-0">Son auto</p>
          <p className="via-voice-addon__hint mt-0.5">
            Ambiance et effets selon ta scène.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={soundAutoOn}
          disabled={disabled}
          className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors ${
            soundAutoOn ? "bg-primary border-primary" : "bg-muted border-transparent"
          }`}
          onClick={() => onSoundAutoOnChange(!soundAutoOn)}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-background shadow transition-transform ${
              soundAutoOn ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {soundAutoOn && !customOpen ? (
        <button
          type="button"
          className="via-i2v-sound__auto-line mt-2 w-full text-left text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
          disabled={disabled}
          onClick={() => setCustomOpen(true)}
        >
          Son auto : <span className="text-foreground">{autoSummary}</span> ·{" "}
          <span className="font-medium">modifier</span>
        </button>
      ) : null}

      {panelExpanded ? (
        <div className="via-i2v-sound__custom mt-2 rounded-xl border border-border/50 bg-muted/15">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-semibold"
            disabled={disabled}
            onClick={() => {
              if (!soundAutoOn) return;
              setCustomOpen((o) => !o);
            }}
            aria-expanded={panelExpanded && customOpen}
          >
            Personnaliser le son
            {soundAutoOn ? (
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${customOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            ) : null}
          </button>
          {(customOpen || !soundAutoOn) && (
            <div className="space-y-1 border-t border-border/40 px-3 pb-3 pt-2">
              <VideoI2VAmbienceSelect
                value={i2vAmbience}
                onChange={wrapManualChange(onI2vAmbience)}
                disabled={disabled}
              />
              <VideoI2VSfxSelect
                sfx={i2vSfx}
                onSfxChange={wrapManualChange(onI2vSfx)}
                moment={i2vSfxMoment}
                onMomentChange={wrapManualChange(onI2vSfxMoment)}
                disabled={disabled}
              />
              {soundAutoOn && customOpen ? (
                <button
                  type="button"
                  className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                  disabled={disabled}
                  onClick={() => setCustomOpen(false)}
                >
                  Replier
                </button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
