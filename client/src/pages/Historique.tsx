import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Download, Loader2, Share2, Sparkles, Trash2, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useDeleteLarp, useLarpHistory } from "@/hooks/use-larps";
import { authFetch } from "@/lib/api";
import {
  assertMediaBlob,
  inferDownloadExtension,
  randomLarpDownloadName,
  saveMediaBlob,
} from "@/lib/download-media";
import {
  cleanupShareUiLocks,
  fetchShareBlob,
  shareMediaToPlatform,
  type SharePlatform,
} from "@/lib/share-media";
import { SharePlatformGrid } from "@/components/larp/SharePlatformGrid";
import { clearLastGeneration, getLastGeneration } from "@/lib/last-generation";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { VideoHistoryCardPreview } from "@/components/larp/VideoHistoryCardPreview";
import { VideoResultPlayer } from "@/components/larp/VideoResultPlayer";
import { pickVideoPosterUrl } from "@/lib/video-poster";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

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

const PLATFORM_LABEL: Record<SharePlatform, string> = {
  whatsapp: "WhatsApp",
  snapchat: "Snapchat",
  instagram: "Instagram",
  tiktok: "TikTok",
};

export default function Historique() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { data: larps, isLoading, isError, refetch, isFetching } = useLarpHistory();
  const deleteLarp = useDeleteLarp();
  const [selected, setSelected] = useState<{
    url: string;
    larpId: string;
    resultType: "image" | "video";
    posterUrl?: string;
  } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<{
    larpId: string;
    url: string;
    resultType: "image" | "video";
  } | null>(null);
  const [prefetchedShareBlob, setPrefetchedShareBlob] = useState<Blob | null>(
    null,
  );

  useEffect(() => {
    if (!shareTarget) {
      setPrefetchedShareBlob(null);
      return;
    }
    let cancelled = false;
    void fetchShareBlob(shareTarget.larpId, 0, shareTarget.url)
      .then((blob) => {
        if (!cancelled) setPrefetchedShareBlob(blob);
      })
      .catch(() => {
        if (!cancelled) setPrefetchedShareBlob(null);
      });
    return () => {
      cancelled = true;
    };
  }, [shareTarget]);

  const successLarps = useMemo(
    () =>
      larps?.filter((larp) => {
        const urls = [
          ...getAssetUrls(larp.outputAssets),
          ...getAssetUrls(larp.watermarkedAssets),
        ];
        return larp.status === "success" && urls.length > 0;
      }) ?? [],
    [larps],
  );

  async function handleDownload(
    larpId: string,
    imageIndex: number,
    options?: { resultType?: "image" | "video"; url?: string },
  ) {
    setDownloadingId(larpId);
    try {
      let blob: Blob | null = null;
      try {
        const res = await authFetch(
          `/api/larps/${encodeURIComponent(larpId)}/download/${imageIndex}`,
        );
        blob = await res.blob();
        assertMediaBlob(blob);
      } catch {
        blob = null;
      }

      if (!blob && options?.url) {
        const res = await fetch(options.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        blob = await res.blob();
        assertMediaBlob(blob);
      }

      if (!blob) throw new Error("empty");

      const ext = inferDownloadExtension(blob, options);
      const outcome = await saveMediaBlob(blob, randomLarpDownloadName(ext), {
        resultType: options?.resultType,
        fallbackUrl: options?.url,
      });
      if (outcome === "aborted") return;
      toast({ title: "Image téléchargée !" });
    } catch {
      toast({
        title: "Téléchargement impossible",
        description: "Réessaie, ou appuie longuement sur l’image pour l’enregistrer.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleShare(platform: SharePlatform) {
    if (!shareTarget) return;
    const target = shareTarget;
    const blob = prefetchedShareBlob;
    // Close the drawer first so the black overlay cannot stick.
    setShareTarget(null);
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    cleanupShareUiLocks();

    try {
      const outcome = await shareMediaToPlatform({
        larpId: target.larpId,
        imageIndex: 0,
        assetUrl: target.url,
        resultType: target.resultType,
        platform,
        blob,
      });
      if (outcome === "cancelled") return;
      if (outcome === "shared" || outcome === "opened-app") {
        if (platform === "snapchat") {
          toast({
            title: "Snapchat ouvert",
            description:
              "Ta photo est enregistrée — envoie-la depuis ta galerie dans Snapchat.",
          });
        }
        return;
      }
      toast({
        title: "Image enregistrée",
        description:
          platform === "snapchat"
            ? "Ouvre Snapchat → Nouveau Snap → Galerie, puis choisis la photo LuxeFlexIA."
            : `Ouvre ${PLATFORM_LABEL[platform]} et envoie-la depuis ta galerie.`,
      });
    } catch {
      cleanupShareUiLocks();
      toast({
        title: "Partage impossible",
        description: "Télécharge l’image puis ouvre l’appli pour l’envoyer.",
        variant: "destructive",
      });
    }
  }

  async function handleDelete(larpId: string) {
    const confirmed = window.confirm(
      "Supprimer cette image de ton historique ? Cette action est définitive.",
    );
    if (!confirmed) return;

    setDeletingId(larpId);
    try {
      await deleteLarp.mutateAsync(larpId);
      if (selected?.larpId === larpId) setSelected(null);
      const last = getLastGeneration();
      if (last?.larpId === larpId) clearLastGeneration();
      toast({ title: "Image supprimée" });
    } catch {
      toast({
        title: "Suppression impossible",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--lx-gold)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-20 text-center">
        <Sparkles className="h-10 w-10 text-[var(--lx-gold)]" strokeWidth={1.5} />
        <h1 className="lx-display text-2xl font-semibold text-[var(--lx-ink)] md:text-3xl">
          Impossible de charger l&apos;historique
        </h1>
        <p className="text-sm text-[var(--lx-muted)]">
          Réessaie dans un instant.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="lx-btn-gold inline-flex h-12 items-center justify-center rounded-full px-6 text-sm"
          disabled={isFetching}
        >
          {isFetching ? "Chargement…" : "Réessayer"}
        </button>
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

  const actionBtnClass =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/70 text-white shadow-md backdrop-blur-sm transition hover:bg-black/85 active:scale-95 disabled:opacity-60";

  return (
    <div className="space-y-8 py-6">
      <h1 className="lx-display text-center text-2xl font-semibold text-[var(--lx-ink)] md:text-3xl">
        Historique
      </h1>

      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
        {successLarps.map((larp) => {
          const urls = [
            ...getAssetUrls(larp.outputAssets),
            ...getAssetUrls(larp.watermarkedAssets),
          ];
          const inputUrls = getAssetUrls(larp.inputAssets);
          const resultType =
            larp.generationType === "video" ? "video" : "image";
          const posterUrl = pickVideoPosterUrl(inputUrls);
          const busyDownload = downloadingId === larp.id;
          const busyDelete = deletingId === larp.id;

          return (
            <div
              key={larp.id}
              className="group/hist relative aspect-[9/16] cursor-pointer overflow-hidden rounded-lg border border-[var(--lx-gold)]/40 bg-[var(--lx-ink-soft)]"
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
                  className="transition-transform duration-500 group-hover/hist:scale-[1.03]"
                />
              ) : (
                <img
                  src={urls[0]}
                  alt="Création"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/hist:scale-[1.03]"
                  loading="lazy"
                />
              )}

              {/* Date — always visible */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-3 pb-3 pt-14">
                <p className="text-xs font-medium text-white/90">
                  {formatCreatedAt(larp.createdAt)}
                </p>
              </div>

              {/*
                Action bar: Share + Download + Delete.
                Visible on hover (desktop) and always on touch (no hover).
                Named group/hist avoids parent `.group` conflicts.
              */}
              <div
                className="absolute inset-x-0 top-0 z-30 flex items-start justify-end gap-1.5 bg-gradient-to-b from-black/55 to-transparent p-2 opacity-100 transition-opacity duration-200 max-md:opacity-100 md:opacity-0 md:group-hover/hist:opacity-100 md:group-focus-within/hist:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  title="Partager"
                  aria-label="Partager"
                  onClick={() =>
                    setShareTarget({
                      larpId: larp.id,
                      url: urls[0],
                      resultType,
                    })
                  }
                  className={actionBtnClass}
                >
                  <Share2 className="h-4 w-4 text-[var(--lx-gold-soft)]" />
                </button>
                <button
                  type="button"
                  title="Télécharger"
                  aria-label="Télécharger"
                  disabled={busyDownload}
                  onClick={() =>
                    void handleDownload(larp.id, 0, {
                      resultType,
                      url: urls[0],
                    })
                  }
                  className={actionBtnClass}
                >
                  {busyDownload ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--lx-gold-soft)]" />
                  ) : (
                    <Download className="h-4 w-4 text-[var(--lx-gold-soft)]" />
                  )}
                </button>
                <button
                  type="button"
                  title="Supprimer"
                  aria-label="Supprimer"
                  disabled={busyDelete || deleteLarp.isPending}
                  onClick={() => void handleDelete(larp.id)}
                  className={`${actionBtnClass} border-red-400/60`}
                >
                  {busyDelete ? (
                    <Loader2 className="h-4 w-4 animate-spin text-red-300" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-red-300" />
                  )}
                </button>
              </div>
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
                  title="Supprimer"
                  disabled={deletingId === selected.larpId}
                  onClick={() => void handleDelete(selected.larpId)}
                  className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-red-400/50 bg-black/55 text-red-400 disabled:opacity-60"
                >
                  {deletingId === selected.larpId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
                <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShareTarget({
                        larpId: selected.larpId,
                        url: selected.url,
                        resultType: selected.resultType,
                      })
                    }
                    className="flex h-11 items-center gap-2 rounded-full border border-white/25 bg-black/55 px-4 text-sm font-medium text-white backdrop-blur-sm"
                  >
                    <Share2 className="h-4 w-4" />
                    Partager
                  </button>
                  <button
                    type="button"
                    disabled={downloadingId === selected.larpId}
                    onClick={() =>
                      void handleDownload(selected.larpId, 0, {
                        resultType: selected.resultType,
                        url: selected.url,
                      })
                    }
                    className="lx-btn-gold flex h-11 items-center gap-2 rounded-full px-5 text-sm disabled:opacity-70"
                  >
                    {downloadingId === selected.larpId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Télécharger
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {isMobile ? (
        <Drawer
          open={Boolean(shareTarget)}
          onOpenChange={(open) => !open && setShareTarget(null)}
        >
          <DrawerContent>
            <DrawerHeader className="text-center">
              <DrawerTitle>Partager</DrawerTitle>
              <DrawerDescription>
                Snapchat s&apos;ouvre directement avec ta photo enregistrée.
              </DrawerDescription>
            </DrawerHeader>
            <SharePlatformGrid
              className="px-4 pb-6 pt-2"
              onSelect={(platform) => void handleShare(platform)}
            />
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={Boolean(shareTarget)}
          onOpenChange={(open) => !open && setShareTarget(null)}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center">Partager</DialogTitle>
              <DialogDescription className="text-center">
                Envoie-la sur Snapchat, Instagram, WhatsApp…
              </DialogDescription>
            </DialogHeader>
            <SharePlatformGrid
              className="gap-3 pt-2"
              iconClassName="h-12 w-12 shadow-sm"
              onSelect={(platform) => void handleShare(platform)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
