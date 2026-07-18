import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Download, Loader2, Sparkles, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useLarpHistory } from "@/hooks/use-larps";
import { authFetch } from "@/lib/api";
import {
  inferDownloadExtension,
  randomLarpDownloadName,
  triggerBlobDownload,
} from "@/lib/download-media";
import { useToast } from "@/hooks/use-toast";
import { VideoHistoryCardPreview } from "@/components/larp/VideoHistoryCardPreview";
import { VideoResultPlayer } from "@/components/larp/VideoResultPlayer";
import { pickVideoPosterUrl } from "@/lib/video-poster";

function getAssetUrls(assets: string[] | string | null | undefined): string[] {
  if (!assets) return [];
  if (Array.isArray(assets)) return assets;
  try {
    const parsed = JSON.parse(assets);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatCreatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export default function Historique() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: larps, isLoading } = useLarpHistory();
  const [selected, setSelected] = useState<{
    url: string;
    larpId: string;
    resultType: "image" | "video";
    posterUrl?: string;
  } | null>(null);

  const successLarps = useMemo(
    () =>
      larps?.filter(
        (larp) =>
          larp.status === "success" &&
          getAssetUrls(larp.outputAssets).length > 0,
      ) ?? [],
    [larps],
  );

  async function handleDownload(
    larpId: string,
    imageIndex: number,
    options?: { resultType?: "image" | "video"; url?: string },
  ) {
    try {
      const res = await authFetch(
        `/api/larps/${encodeURIComponent(larpId)}/download/${imageIndex}`,
      );
      const blob = await res.blob();
      const ext = inferDownloadExtension(blob, options);
      triggerBlobDownload(blob, randomLarpDownloadName(ext));
    } catch {
      toast({
        title: "Téléchargement impossible",
        variant: "destructive",
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--lx-gold)]" />
      </div>
    );
  }

  if (!successLarps.length) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-20 text-center">
        <Sparkles className="h-10 w-10 text-[var(--lx-gold)]" strokeWidth={1.5} />
        <h1 className="lx-display text-2xl font-semibold text-[var(--lx-ink)] md:text-3xl">
          Aucune création pour le moment
        </h1>
        <p className="text-sm text-[var(--lx-muted)]">
          Tes images générées apparaîtront ici, de la plus récente à la plus
          ancienne.
        </p>
        <button
          type="button"
          onClick={() => setLocation("/generate")}
          className="lx-btn-gold inline-flex h-12 items-center justify-center rounded-full px-6 text-sm"
        >
          Créer ma première image
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-6">
      <h1 className="lx-display text-center text-2xl font-semibold text-[var(--lx-ink)] md:text-3xl">
        Historique
      </h1>

      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
        {successLarps.map((larp) => {
          const urls = getAssetUrls(larp.outputAssets);
          const inputUrls = getAssetUrls(larp.inputAssets);
          const resultType =
            larp.generationType === "video" ? "video" : "image";
          const posterUrl = pickVideoPosterUrl(inputUrls);

          return (
            <div
              key={larp.id}
              className="group relative aspect-[9/16] cursor-pointer overflow-hidden rounded-lg border border-[var(--lx-gold)]/40 bg-[var(--lx-ink-soft)]"
              onClick={() =>
                setSelected({
                  url: urls[0],
                  larpId: larp.id,
                  resultType,
                  posterUrl,
                })
              }
            >
              {resultType === "video" ? (
                <VideoHistoryCardPreview
                  posterUrl={posterUrl}
                  className="transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <img
                  src={urls[0]}
                  alt="Création"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              )}

              <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-3 pt-10">
                <p className="text-xs font-medium text-white/90">
                  {formatCreatedAt(larp.createdAt)}
                </p>
              </div>

              <button
                type="button"
                title="Télécharger"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDownload(larp.id, 0, {
                    resultType,
                    url: urls[0],
                  });
                }}
                className="absolute right-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--lx-gold)]/45 bg-black/55 text-[var(--lx-gold-soft)] opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {selected &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setSelected(null)}
            />
            <div className="relative z-10 w-full max-w-sm">
              <div className="relative aspect-[9/16] overflow-hidden rounded-lg border border-[var(--lx-gold)]/55 bg-[var(--lx-ink)] shadow-[0_24px_64px_rgba(0,0,0,0.35)]">
                {selected.resultType === "video" ? (
                  <VideoResultPlayer
                    src={selected.url}
                    poster={selected.posterUrl}
                  />
                ) : (
                  <img
                    src={selected.url}
                    alt="Création"
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void handleDownload(selected.larpId, 0, {
                      resultType: selected.resultType,
                      url: selected.url,
                    })
                  }
                  className="lx-btn-gold absolute bottom-3 left-1/2 z-10 flex h-11 -translate-x-1/2 items-center gap-2 rounded-full px-5 text-sm"
                >
                  <Download className="h-4 w-4" />
                  Télécharger
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
