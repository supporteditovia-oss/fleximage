import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, Play } from "lucide-react";
import {
  fetchI2VVoicePreviewUrl,
  fetchI2VVoices,
  type I2VCloneVoice,
  type I2VLibraryVoice,
} from "@/lib/i2v-voices-api";
import {
  readI2VVoiceGenderFilter,
  readLastI2VVoiceId,
  writeI2VVoiceGenderFilter,
  writeLastI2VVoiceId,
  type I2VVoiceGenderFilter,
} from "@/lib/i2v-voice-prefs";
import { VideoI2VVoiceClonePanel } from "@/components/video/VideoI2VVoiceClonePanel";

type VoiceRow = {
  id: string;
  name: string;
  styleFr: string;
  gender: "homme" | "femme" | null;
  kind: "clone" | "library";
};

type VideoI2VVoiceSelectProps = {
  selectedVoiceId: string | null;
  onSelectedVoiceId: (id: string) => void;
  suggestedFilter?: I2VVoiceGenderFilter | null;
  suggestedFilterLabel?: string | null;
  disabled?: boolean;
};

function toRows(
  clones: I2VCloneVoice[],
  library: I2VLibraryVoice[],
  filter: I2VVoiceGenderFilter,
): VoiceRow[] {
  const cloneRows: VoiceRow[] = clones.map((c) => ({
    id: c.i2vVoiceId,
    name: c.name,
    styleFr: c.styleFr,
    gender: null,
    kind: "clone",
  }));
  const libRows: VoiceRow[] = library
    .filter((v) => filter === "all" || v.gender === filter)
    .map((v) => ({
      id: v.id,
      name: v.name,
      styleFr: v.styleFr,
      gender: v.gender,
      kind: "library",
    }));
  return [...cloneRows, ...libRows];
}

function resolveActiveVoice(
  selectedVoiceId: string | null,
  clones: I2VCloneVoice[],
  library: I2VLibraryVoice[],
): { name: string; styleFr: string; kind: "clone" | "library" } | null {
  if (!selectedVoiceId) return null;
  const clone = clones.find((c) => c.i2vVoiceId === selectedVoiceId);
  if (clone) {
    return { name: clone.name, styleFr: clone.styleFr, kind: "clone" };
  }
  const lib = library.find((v) => v.id === selectedVoiceId);
  if (lib) {
    return { name: lib.name, styleFr: lib.styleFr, kind: "library" };
  }
  return null;
}

export function VideoI2VVoiceSelect({
  selectedVoiceId,
  onSelectedVoiceId,
  suggestedFilter,
  suggestedFilterLabel,
  disabled,
}: VideoI2VVoiceSelectProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clones, setClones] = useState<I2VCloneVoice[]>([]);
  const [library, setLibrary] = useState<I2VLibraryVoice[]>([]);
  const [defaultVoiceId, setDefaultVoiceId] = useState<string | null>(null);
  const [filter, setFilter] = useState<I2VVoiceGenderFilter>(() =>
    readI2VVoiceGenderFilter(),
  );
  const [filterSuggested, setFilterSuggested] = useState(false);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const initVoiceRef = useRef(false);

  const reloadVoices = useCallback(async () => {
    setLoading(true);
    const payload = await fetchI2VVoices();
    setLoading(false);
    if (!payload) return;
    setClones(payload.clones);
    setLibrary(payload.library);
    setDefaultVoiceId(payload.defaultVoiceId);

    if (initVoiceRef.current) return;
    initVoiceRef.current = true;

    const last = readLastI2VVoiceId();
    const preferClone = payload.clones[0]?.i2vVoiceId;
    const candidate =
      (last &&
        (payload.clones.some((c) => c.i2vVoiceId === last) ||
          payload.library.some((v) => v.id === last)) &&
        last) ||
      preferClone ||
      payload.defaultVoiceId ||
      payload.library[0]?.id ||
      null;
    if (candidate) onSelectedVoiceId(candidate);
  }, [onSelectedVoiceId]);

  useEffect(() => {
    void reloadVoices();
  }, [reloadVoices]);

  useEffect(() => {
    if (!suggestedFilter || suggestedFilter === "all") return;
    setFilter((prev) => {
      if (prev === suggestedFilter) return prev;
      setFilterSuggested(true);
      return suggestedFilter;
    });
  }, [suggestedFilter]);

  useEffect(() => {
    writeI2VVoiceGenderFilter(filter);
  }, [filter]);

  useEffect(() => {
    if (selectedVoiceId) writeLastI2VVoiceId(selectedVoiceId);
  }, [selectedVoiceId]);

  const rows = useMemo(
    () => toRows(clones, library, filter),
    [clones, library, filter],
  );

  const activeVoice = useMemo(
    () => resolveActiveVoice(selectedVoiceId, clones, library),
    [selectedVoiceId, clones, library],
  );

  const summaryLabel = useMemo(() => {
    if (loading) return "Chargement…";
    if (activeVoice) {
      const prefix = activeVoice.kind === "clone" ? "Ma voix · " : "";
      return `${prefix}${activeVoice.name} (${activeVoice.styleFr})`;
    }
    if (defaultVoiceId) return "Choisir une voix";
    return "Aucune voix";
  }, [loading, activeVoice, defaultVoiceId]);

  const stopPreview = () => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
    }
    setPreviewLoadingId(null);
  };

  const closePanel = () => {
    stopPreview();
    setPanelOpen(false);
  };

  const pickVoice = (voiceId: string) => {
    onSelectedVoiceId(voiceId);
    closePanel();
  };

  const playPreview = async (voiceId: string) => {
    if (disabled) return;
    stopPreview();
    setPreviewLoadingId(voiceId);
    const url = await fetchI2VVoicePreviewUrl(voiceId);
    if (!url) {
      setPreviewLoadingId(null);
      return;
    }
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.onended = () => setPreviewLoadingId(null);
    audio.onerror = () => setPreviewLoadingId(null);
    audio.src = url;
    setPreviewLoadingId(voiceId);
    try {
      await audio.play();
    } catch {
      setPreviewLoadingId(null);
    }
  };

  useEffect(() => () => stopPreview(), []);

  return (
    <div className="via-i2v-voice">
      <audio ref={audioRef} className="hidden" preload="none" />

      {!panelOpen ? (
        <button
          type="button"
          className="via-i2v-voice__summary-line w-full text-left text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
          disabled={disabled || loading}
          onClick={() => setPanelOpen(true)}
        >
          Voix : <span className="text-foreground">{summaryLabel}</span> ·{" "}
          <span className="font-medium">changer</span>
        </button>
      ) : null}

      {panelOpen ? (
        <div className="via-i2v-voice__panel mt-2 rounded-xl border border-border/50 bg-muted/15">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-semibold"
            disabled={disabled}
            onClick={() => closePanel()}
            aria-expanded
          >
            Choisir la voix
            <ChevronDown className="h-4 w-4 shrink-0 rotate-180" aria-hidden />
          </button>

          <div className="space-y-2 border-t border-border/40 px-3 pb-3 pt-2">
            <div className="via-i2v-voice__head">
              <VideoI2VVoiceClonePanel
                disabled={disabled}
                onCloneCreated={() => void reloadVoices()}
                onSelectClone={pickVoice}
              />
            </div>

            <div className="via-i2v-voice__filters" role="group" aria-label="Filtre voix">
              {(["all", "homme", "femme"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`via-i2v-voice__filter ${filter === key ? "is-active" : ""}`}
                  disabled={disabled}
                  onClick={() => {
                    setFilterSuggested(false);
                    setFilter(key);
                  }}
                >
                  {key === "all" ? "Tous" : key === "homme" ? "Homme" : "Femme"}
                  {filterSuggested && filter === key && suggestedFilter === key ? (
                    <span className="via-i2v-voice__suggested"> · suggéré</span>
                  ) : null}
                </button>
              ))}
            </div>
            {suggestedFilterLabel && filterSuggested ? (
              <p className="via-voice-addon__hint">
                Scène : {suggestedFilterLabel} — filtre{" "}
                {filter === "femme" ? "Femme" : "Homme"} suggéré.
              </p>
            ) : null}

            {loading ? (
              <p className="via-voice-addon__hint">
                <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" aria-hidden />
                Chargement des voix…
              </p>
            ) : (
              <ul className="via-i2v-voice__list">
                {rows.map((row) => {
                  const selected = selectedVoiceId === row.id;
                  const previewBusy = previewLoadingId === row.id;
                  return (
                    <li key={row.id}>
                      <div
                        className={`via-i2v-voice__row ${selected ? "is-selected" : ""}`}
                      >
                        <button
                          type="button"
                          className="via-i2v-voice__play"
                          aria-label={`Aperçu ${row.name}`}
                          disabled={disabled}
                          onClick={() => void playPreview(row.id)}
                        >
                          {previewBusy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          className="via-i2v-voice__pick"
                          disabled={disabled}
                          onClick={() => pickVoice(row.id)}
                        >
                          <span className="via-i2v-voice__meta">
                            <span className="via-i2v-voice__name">
                              {row.kind === "clone" ? "Ma voix · " : ""}
                              {row.name}
                            </span>
                            <span className="via-i2v-voice__desc">{row.styleFr}</span>
                          </span>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {!loading && rows.length === 0 ? (
              <p className="via-voice-addon__hint">
                Aucune voix pour ce filtre. Essaie « Tous » ou clone ta voix.
              </p>
            ) : null}

            <button
              type="button"
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
              disabled={disabled}
              onClick={() => closePanel()}
            >
              Replier
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
