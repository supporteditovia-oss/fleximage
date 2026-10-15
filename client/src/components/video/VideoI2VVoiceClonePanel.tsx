import { useCallback, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cloneVoice } from "@/lib/voice-api";
import { voiceClipToDataUrl } from "@/lib/cloned-voices-storage";
import {
  I2V_CLONE_GUIDED_SCRIPT_FR,
  I2V_CLONE_MIN_DURATION_SEC,
  I2V_CLONE_QUIET_HINT_FR,
} from "@shared/i2v-clone-guided-script";
import {
  formatClipTime,
  recordVoiceClip,
  revokeVoiceClipUrl,
  type VoiceClip,
} from "@/lib/voice-capture";

type VideoI2VVoiceClonePanelProps = {
  disabled?: boolean;
  onCloneCreated: () => void;
  onSelectClone: (i2vVoiceId: string) => void;
};

export function VideoI2VVoiceClonePanel({
  disabled,
  onCloneCreated,
  onSelectClone,
}: VideoI2VVoiceClonePanelProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [clip, setClip] = useState<VoiceClip | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const stopRecordRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<number | null>(null);

  const resetClip = useCallback(() => {
    revokeVoiceClipUrl(clip);
    setClip(null);
    setElapsed(0);
  }, [clip]);

  const startRecording = async () => {
    if (disabled || recording) return;
    resetClip();
    try {
      const session = await recordVoiceClip();
      stopRecordRef.current = session.stop;
      setRecording(true);
      const started = Date.now();
      timerRef.current = window.setInterval(() => {
        setElapsed((Date.now() - started) / 1000);
      }, 200);
      session.promise.then((next) => {
        if (timerRef.current) window.clearInterval(timerRef.current);
        setRecording(false);
        setElapsed(next.durationSec);
        setClip(next);
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Micro inaccessible.";
      toast({ variant: "destructive", title: "Micro", description: message });
    }
  };

  const stopRecording = () => {
    stopRecordRef.current?.();
    stopRecordRef.current = null;
  };

  const submitClone = async () => {
    if (!clip || clip.durationSec < I2V_CLONE_MIN_DURATION_SEC - 0.2) {
      toast({
        variant: "destructive",
        title: "Trop court",
        description: `Minimum ${I2V_CLONE_MIN_DURATION_SEC} s de voix claire.`,
      });
      return;
    }
    setSubmitting(true);
    try {
      const dataUrl = await voiceClipToDataUrl(clip);
      const result = await cloneVoice({
        name: "Ma voix",
        audioDataUrl: dataUrl,
        sourceType: "record",
        sourceLabel: "I2V studio",
        durationSec: clip.durationSec,
      });
      const i2vId = `clone:${result.clone.id}`;
      onSelectClone(i2vId);
      onCloneCreated();
      toast({ title: "Voix clonée", description: "Ta voix apparaît dans « Mes voix »." });
      setOpen(false);
      resetClip();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Clonage impossible.";
      toast({ variant: "destructive", title: "Clonage refusé", description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="via-i2v-voice-clone">
      <button
        type="button"
        className="via-i2v-voice-clone__trigger"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <Mic className="h-4 w-4" aria-hidden />
        Cloner ma voix
      </button>

      {open ? (
        <div className="via-i2v-voice-clone__panel">
          <p className="via-voice-addon__hint">{I2V_CLONE_QUIET_HINT_FR}</p>
          <div className="via-i2v-voice-clone__script">{I2V_CLONE_GUIDED_SCRIPT_FR}</div>
          <p className="via-voice-addon__hint">
            {recording
              ? `Enregistrement… ${formatClipTime(elapsed)} (vise ~1 min)`
              : clip
                ? `Prêt · ${formatClipTime(clip.durationSec)} — min ${I2V_CLONE_MIN_DURATION_SEC} s`
                : `Lis le texte à voix haute (~1 min, min ${I2V_CLONE_MIN_DURATION_SEC} s).`}
          </p>
          <div className="via-i2v-voice-clone__actions">
            {recording ? (
              <button type="button" className="via-cta via-cta--secondary" onClick={stopRecording}>
                <Square className="h-4 w-4" />
                Arrêter
              </button>
            ) : (
              <button
                type="button"
                className="via-cta via-cta--secondary"
                disabled={disabled || submitting}
                onClick={() => void startRecording()}
              >
                <Mic className="h-4 w-4" />
                {clip ? "Réenregistrer" : "Enregistrer"}
              </button>
            )}
            <button
              type="button"
              className="via-cta"
              disabled={!clip || submitting || clip.durationSec < I2V_CLONE_MIN_DURATION_SEC - 0.2}
              onClick={() => void submitClone()}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Clonage…
                </>
              ) : (
                "Créer ma voix"
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
