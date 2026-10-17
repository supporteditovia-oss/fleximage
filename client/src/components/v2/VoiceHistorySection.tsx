import { useCallback, useRef, useState, type KeyboardEvent } from "react";
import { Check, Pause, Play, Share2, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { VoiceShareSheet } from "@/components/v2/VoiceShareSheet";
import {
  useDeleteVoiceGenerations,
  useVoiceHistory,
  type VoiceHistoryItem,
} from "@/hooks/use-voice-history";
import { fetchVoiceBlob, shareVoiceAudio, type VoiceSharePlatform } from "@/lib/share-voice";
import { useToast } from "@/hooks/use-toast";

function formatHistoryDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function truncateText(text: string, max = 72): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

type VoiceHistorySectionProps = {
  enabled?: boolean;
  onPlay?: (url: string) => void;
  onStop?: () => void;
};

export function VoiceHistorySection({
  enabled = true,
  onPlay,
  onStop,
}: VoiceHistorySectionProps) {
  const { toast } = useToast();
  const { data: items = [], isLoading, isError, refetch } = useVoiceHistory(enabled);
  const deleteGenerations = useDeleteVoiceGenerations();

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [shareItem, setShareItem] = useState<VoiceHistoryItem | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const shareBlobRef = useRef<Blob | null>(null);
  const historyAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopHistoryAudio = useCallback(() => {
    const audio = historyAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlayingId(null);
    onStop?.();
  }, [onStop]);

  const togglePlay = useCallback(
    async (item: VoiceHistoryItem) => {
      if (!item.audioUrl) return;
      if (playingId === item.id) {
        stopHistoryAudio();
        return;
      }

      stopHistoryAudio();
      let audio = historyAudioRef.current;
      if (!audio) {
        audio = new Audio();
        historyAudioRef.current = audio;
      }
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      audio.src = item.audioUrl;
      audio.currentTime = 0;
      setPlayingId(item.id);
      onPlay?.(item.audioUrl);
      try {
        await audio.play();
      } catch {
        setPlayingId(null);
      }
    },
    [onPlay, playingId, stopHistoryAudio],
  );

  const openShare = useCallback(
    async (item: VoiceHistoryItem) => {
      if (!item.audioUrl) return;
      stopHistoryAudio();
      setShareItem(item);
      setShareOpen(true);
      shareBlobRef.current = null;
      try {
        shareBlobRef.current = await fetchVoiceBlob(item.audioUrl, item.id);
      } catch {
        shareBlobRef.current = null;
      }
    },
    [stopHistoryAudio],
  );

  const handleShare = async (platform: VoiceSharePlatform) => {
    if (!shareItem?.audioUrl || isSharing) return;
    setIsSharing(true);
    try {
      const outcome = await shareVoiceAudio({
        audioUrl: shareItem.audioUrl,
        generationId: shareItem.id,
        blob: shareBlobRef.current,
        platform,
      });
      setShareOpen(false);
      if (outcome === "shared") {
        toast({ title: "Vocal partagé" });
      } else if (outcome === "opened-app") {
        toast({
          title: "WhatsApp ouvert",
          description: "Choisis ton contact et envoie le vocal.",
        });
      } else if (outcome === "saved") {
        toast({
          title: "Audio enregistré",
          description: "Ouvre WhatsApp ou Telegram et envoie le fichier audio.",
        });
      }
    } catch (error) {
      toast({
        title: "Partage impossible",
        description:
          error instanceof Error ? error.message : "Réessaie dans un instant.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const onDeleteError = () => {
    toast({
      title: "Suppression impossible",
      description: "Réessaie dans un instant.",
      variant: "destructive",
    });
  };

  const deleteSelected = () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (playingId && ids.includes(playingId)) stopHistoryAudio();
    exitSelection();
    deleteGenerations.mutate(ids, { onError: onDeleteError });
  };

  const confirmDeleteAll = () => {
    const ids = items.map((item) => item.id);
    if (ids.length === 0) return;
    setDeleteAllOpen(false);
    stopHistoryAudio();
    exitSelection();
    deleteGenerations.mutate(ids, { onError: onDeleteError });
  };

  if (!enabled) return null;

  return (
    <>
      <section className="vs-card vs-card--list" aria-labelledby="vs-history-title">
        <div className="vs-history-head">
          <div>
            <h3 id="vs-history-title" className="vs-card__title">
              Historique vocaux
            </h3>
            <p className="vs-card__sub vs-card__sub--tight">
              Toutes tes générations — réécoute, partage ou supprime.
            </p>
          </div>
          {items.length > 0 ? (
            selectionMode ? (
              <div className="vs-history-head-actions">
                <button
                  type="button"
                  className="vs-history-delete-all"
                  onClick={() => setDeleteAllOpen(true)}
                >
                  Tout supprimer
                </button>
                <button type="button" className="vs-link" onClick={exitSelection}>
                  Annuler
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="vs-link"
                onClick={() => setSelectionMode(true)}
              >
                Sélectionner
              </button>
            )
          ) : null}
        </div>

        {isLoading ? (
          <p className="vs-help" role="status">
            Chargement de l’historique…
          </p>
        ) : isError ? (
          <p className="vs-capture-error" role="alert">
            Impossible de charger l’historique.{" "}
            <button type="button" className="vs-link" onClick={() => void refetch()}>
              Réessayer
            </button>
          </p>
        ) : items.length === 0 ? (
          <p className="vs-help">Aucun vocal généré pour l’instant.</p>
        ) : (
          <ul className="vs-history-list">
            {items.map((item) => {
              const isPlaying = playingId === item.id;
              const isSelected = selectedIds.has(item.id);
              return (
                <li
                  key={item.id}
                  className={`vs-history-item${isSelected ? " is-selected" : ""}${
                    selectionMode ? " is-selectable" : ""
                  }`}
                  {...(selectionMode
                    ? {
                        role: "button" as const,
                        tabIndex: 0,
                        "aria-pressed": isSelected,
                        onClick: () => toggleSelected(item.id),
                        onKeyDown: (event: KeyboardEvent) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleSelected(item.id);
                          }
                        },
                      }
                    : {})}
                >
                  {selectionMode ? (
                    <span
                      className={`vs-history-select${isSelected ? " is-on" : ""}`}
                      aria-hidden
                    >
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      ) : null}
                    </span>
                  ) : null}
                  <div className="vs-history-copy">
                    <strong>{item.voiceName || "Voix clonée"}</strong>
                    <span>{truncateText(item.text)}</span>
                    <em>{formatHistoryDate(item.createdAt)}</em>
                  </div>
                  {!selectionMode ? (
                    <div className="vs-history-actions">
                      <button
                        type="button"
                        className={`vs-cloned-row__replay${isPlaying ? " is-playing" : ""}`}
                        aria-label={isPlaying ? "Pause" : "Écouter"}
                        onClick={() => void togglePlay(item)}
                        disabled={!item.audioUrl}
                      >
                        {isPlaying ? (
                          <Pause className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <Play className="h-3.5 w-3.5" aria-hidden />
                        )}
                      </button>
                      <button
                        type="button"
                        className="vs-cloned-row__replay"
                        aria-label="Partager"
                        onClick={() => void openShare(item)}
                        disabled={!item.audioUrl}
                      >
                        <Share2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {selectionMode && selectedIds.size > 0 ? (
          <div className="vs-history-bulk">
            <span>{selectedIds.size} sélectionné(s)</span>
            <button
              type="button"
              className="vs-history-delete"
              onClick={deleteSelected}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Supprimer
            </button>
            <button type="button" className="vs-link" onClick={exitSelection}>
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : null}
      </section>

      <VoiceShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onSelect={(platform) => {
          void handleShare(platform);
        }}
      />

      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tout supprimer ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu vas effacer {items.length} vocal{items.length > 1 ? "aux" : ""} de ton
              historique. Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                confirmDeleteAll();
              }}
            >
              Tout supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
