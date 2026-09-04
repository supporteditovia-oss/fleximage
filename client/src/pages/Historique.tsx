import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Download, Check, Loader2, Share2, Sparkles, Trash2, X } from "lucide-react";
import { createPortal, flushSync } from "react-dom";
import { useDeleteLarp, useDeleteLarps, useLarpHistory } from "@/hooks/use-larps";
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
  toSnapFriendlyImageFile,
  type SharePlatform,
} from "@/lib/share-media";
import { ShareSheet } from "@/components/larp/ShareSheet";
import { clearLastGeneration, getLastGeneration } from "@/lib/last-generation";
import { useToast } from "@/hooks/use-toast";
import { VideoHistoryCardPreview } from "@/components/larp/VideoHistoryCardPreview";
import { VideoResultPlayer } from "@/components/larp/VideoResultPlayer";
import { pickVideoPosterUrl } from "@/lib/video-poster";
import { useTranslation } from "react-i18next";
import { useStudioPath } from "@/hooks/use-studio-path";

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

function formatCreatedAt(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "fr-FR", {
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
  const studioPath = useStudioPath();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const {
    data: larps,
    isPending,
    isError,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLarpHistory();
  const deleteLarp = useDeleteLarp();
  const deleteLarps = useDeleteLarps();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [loadingAllForSelect, setLoadingAllForSelect] = useState(false);
  const [pendingSelectAll, setPendingSelectAll] = useState(false);
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
  const [prefetchedShareFile, setPrefetchedShareFile] = useState<File | null>(
    null,
  );
  const shareTargetRef = useRef(shareTarget);
  const shareBlobRef = useRef(prefetchedShareBlob);
  const shareFileRef = useRef(prefetchedShareFile);
  shareTargetRef.current = shareTarget;
  shareBlobRef.current = prefetchedShareBlob;
  shareFileRef.current = prefetchedShareFile;

  useEffect(() => {
    if (!shareTarget) {
      setPrefetchedShareBlob(null);
      setPrefetchedShareFile(null);
      return;
    }
    let cancelled = false;
    void fetchShareBlob(shareTarget.larpId, 0, shareTarget.url)
      .then(async (blob) => {
        if (cancelled) return;
        setPrefetchedShareBlob(blob);
        if (shareTarget.resultType !== "video") {
          try {
            const file = await toSnapFriendlyImageFile(blob);
            if (!cancelled) setPrefetchedShareFile(file);
          } catch {
            /* share will convert on demand */
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPrefetchedShareBlob(null);
          setPrefetchedShareFile(null);
        }
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

  const allVisibleSelected =
    successLarps.length > 0 &&
    successLarps.every((larp) => selectedIds.has(larp.id));

  useEffect(() => {
    if (!selectionMode) return;
    setSelectedIds((prev) => {
      const valid = new Set(successLarps.map((larp) => larp.id));
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (valid.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [selectionMode, successLarps]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((entry) => entry.isIntersecting) &&
          !isFetchingNextPage
        ) {
          void fetchNextPage();
        }
      },
      { rootMargin: "400px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, successLarps.length]);

  // Keep fetching while the visible grid is sparse (failed gens take page slots).
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || isPending) return;
    if (successLarps.length >= 12) return;
    void fetchNextPage();
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    successLarps.length,
  ]);

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
      toast({ title: t("history.imageDownloaded") });
    } catch {
      toast({
        title: t("history.downloadError"),
        description: t("history.downloadFailedHint"),
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleShare(platform: SharePlatform) {
    const target = shareTargetRef.current;
    if (!target) return;
    const blob = shareBlobRef.current;
    const shareFile = shareFileRef.current;

    // Start share in the same tap gesture, then remove our sheet (no black scrim).
    const sharePromise = shareMediaToPlatform({
      larpId: target.larpId,
      imageIndex: 0,
      assetUrl: target.url,
      resultType: target.resultType,
      platform,
      blob,
      shareFile,
    });

    flushSync(() => {
      setShareTarget(null);
    });
    cleanupShareUiLocks();

    try {
      const outcome = await sharePromise;

      cleanupShareUiLocks();
      if (outcome === "cancelled") return;

      if (outcome === "shared" && platform === "snapchat") {
        toast({
          title: t("history.shareAlmostTitle"),
          description: t("history.shareAlmostSnap"),
        });
        return;
      }

      if (outcome === "shared" || outcome === "opened-app") return;

      toast({
        title: t("history.savedTitle"),
        description:
          platform === "snapchat"
            ? t("history.savedSnapHint")
            : t("history.savedOtherHint", {
                platform: PLATFORM_LABEL[platform],
              }),
      });
    } catch {
      cleanupShareUiLocks();
      toast({
        title: t("history.shareFailed"),
        description: t("history.shareFailedHint"),
        variant: "destructive",
      });
    }
  }

  async function handleDelete(larpId: string) {
    const confirmed = window.confirm(t("history.confirmDelete"));
    if (!confirmed) return;

    setDeletingId(larpId);
    try {
      await deleteLarp.mutateAsync(larpId);
      if (selected?.larpId === larpId) setSelected(null);
      setSelectedIds((prev) => {
        if (!prev.has(larpId)) return prev;
        const next = new Set(prev);
        next.delete(larpId);
        return next;
      });
      const last = getLastGeneration();
      if (last?.larpId === larpId) clearLastGeneration();
      toast({ title: t("history.deletedToast") });
    } catch {
      toast({
        title: t("history.deleteFailed"),
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setLoadingAllForSelect(false);
    setPendingSelectAll(false);
  }

  function toggleSelectedId(larpId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(larpId)) next.delete(larpId);
      else next.add(larpId);
      return next;
    });
  }

  async function handleSelectAll() {
    setPendingSelectAll(true);
    setLoadingAllForSelect(true);
    try {
      for (let i = 0; i < 100; i += 1) {
        const result = await fetchNextPage();
        if (!result.hasNextPage) break;
      }
    } finally {
      setLoadingAllForSelect(false);
    }
  }

  useEffect(() => {
    if (!pendingSelectAll || loadingAllForSelect || isFetchingNextPage) return;
    if (hasNextPage) return;
    setSelectedIds(new Set(successLarps.map((larp) => larp.id)));
    setPendingSelectAll(false);
  }, [
    pendingSelectAll,
    loadingAllForSelect,
    isFetchingNextPage,
    hasNextPage,
    successLarps,
  ]);

  function handleDeselectAll() {
    setSelectedIds(new Set());
    setPendingSelectAll(false);
  }

  async function handleDeleteSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    const confirmed = window.confirm(
      t("history.confirmDeleteSelected", { count: ids.length }),
    );
    if (!confirmed) return;

    setBulkDeleting(true);
    try {
      const result = await deleteLarps.mutateAsync(ids);
      if (selected && ids.includes(selected.larpId)) setSelected(null);
      const last = getLastGeneration();
      if (last?.larpId && ids.includes(last.larpId)) clearLastGeneration();
      setSelectedIds(new Set());
      setSelectionMode(false);
      toast({
        title: t("history.deletedSelectedToast", {
          count: result.deleted,
        }),
      });
      // Only surface an error when nothing was deleted.
      // Partial failures after a real delete used to show a false "impossible".
      if (result.deleted === 0 && result.failed > 0) {
        toast({
          title: t("history.deleteFailed"),
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: t("history.deleteFailed"),
        variant: "destructive",
      });
    } finally {
      setBulkDeleting(false);
    }
  }

  if (isPending) {
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
          {t("history.loadError")}
        </h1>
        <p className="text-sm text-[var(--lx-muted)]">
          {t("history.loadErrorHint")}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="lx-btn-gold inline-flex h-12 items-center justify-center rounded-full px-6 text-sm"
          disabled={isFetching}
        >
          {isFetching ? t("history.loading") : t("history.retry")}
        </button>
      </div>
    );
  }

  if (!successLarps.length) {
    if (hasNextPage || isFetchingNextPage) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--lx-gold)]" />
        </div>
      );
    }
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-20 text-center">
        <Sparkles className="h-10 w-10 text-[var(--lx-gold)]" strokeWidth={1.5} />
        <h1 className="lx-display text-2xl font-semibold text-[var(--lx-ink)] md:text-3xl">
          {t("history.emptyTitle")}
        </h1>
        <p className="text-sm text-[var(--lx-muted)]">
          {t("history.emptyDescription")}
        </p>
        <button
          type="button"
          onClick={() => setLocation(studioPath)}
          className="lx-btn-gold inline-flex h-12 items-center justify-center rounded-full px-6 text-sm"
        >
          {t("history.emptyCta")}
        </button>
      </div>
    );
  }

  const actionBtnClass =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/70 text-white shadow-md backdrop-blur-sm transition hover:bg-black/85 active:scale-95 disabled:opacity-60";

  return (
    <div className="space-y-6 py-6 pb-28">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-1">
        <h1 className="lx-display text-center text-2xl font-semibold text-[var(--lx-ink)] md:text-3xl">
          {t("history.pageTitle")}
        </h1>

        {!selectionMode ? (
          <button
            type="button"
            onClick={() => {
              setSelectionMode(true);
              setSelected(null);
            }}
            className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--lx-gold)]/40 bg-[var(--lx-surface-2)] px-5 text-sm font-semibold text-[var(--lx-ink)] transition hover:bg-white"
          >
            {t("history.select")}
          </button>
        ) : (
          <div className="flex w-full flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                void (allVisibleSelected
                  ? handleDeselectAll()
                  : handleSelectAll())
              }
              disabled={loadingAllForSelect || bulkDeleting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--lx-gold)]/40 bg-[var(--lx-surface-2)] px-4 text-sm font-semibold text-[var(--lx-ink)] transition hover:bg-white disabled:opacity-60"
            >
              {loadingAllForSelect ? (
                <Loader2 className="h-4 w-4 animate-spin text-[var(--lx-gold)]" />
              ) : null}
              {allVisibleSelected
                ? t("history.deselectAll")
                : t("history.selectAll")}
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteSelected()}
              disabled={selectedIds.size === 0 || bulkDeleting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-400/50 bg-red-500/10 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-500/15 disabled:opacity-50"
            >
              {bulkDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t("history.deleteSelected")}
              {selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
            </button>
            <button
              type="button"
              onClick={exitSelectionMode}
              disabled={bulkDeleting}
              className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-[var(--lx-muted)] transition hover:text-[var(--lx-ink)] disabled:opacity-60"
            >
              {t("history.cancelSelect")}
            </button>
          </div>
        )}

        {selectionMode && selectedIds.size > 0 ? (
          <p className="text-center text-xs font-medium text-[var(--lx-muted)]">
            {t("history.selectedCount", { count: selectedIds.size })}
          </p>
        ) : null}
      </div>

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
          const isChecked = selectedIds.has(larp.id);

          return (
            <div
              key={larp.id}
              className={`group/hist relative aspect-[9/16] cursor-pointer overflow-hidden rounded-lg border bg-[var(--lx-ink-soft)] ${
                selectionMode && isChecked
                  ? "border-[var(--lx-gold)] ring-2 ring-[var(--lx-gold)]/70"
                  : "border-[var(--lx-gold)]/40"
              }`}
              onClick={() => {
                if (selectionMode) {
                  toggleSelectedId(larp.id);
                  return;
                }
                setSelected({
                  url: urls[0],
                  larpId: larp.id,
                  resultType,
                  posterUrl,
                });
              }}
            >
              {resultType === "video" ? (
                <VideoHistoryCardPreview
                  posterUrl={posterUrl}
                  className="transition-transform duration-500 group-hover/hist:scale-[1.03]"
                />
              ) : (
                <img
                  src={urls[0]}
                  alt={t("history.createdAlt")}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/hist:scale-[1.03]"
                  loading="lazy"
                />
              )}

              {selectionMode ? (
                <div className="absolute left-2 top-2 z-30">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-md ${
                      isChecked
                        ? "border-[var(--lx-gold)] bg-[var(--lx-gold)] text-[var(--lx-ink)]"
                        : "border-white/80 bg-black/45 text-transparent"
                    }`}
                    aria-hidden
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                </div>
              ) : null}

              {/* Date — always visible */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-3 pb-3 pt-14">
                <p className="text-xs font-medium text-white/90">
                  {formatCreatedAt(larp.createdAt, i18n.resolvedLanguage || "fr")}
                </p>
              </div>

              {!selectionMode ? (
                <div
                  className="absolute inset-x-0 top-0 z-30 flex items-start justify-end gap-1.5 bg-gradient-to-b from-black/55 to-transparent p-2 opacity-100 transition-opacity duration-200 max-md:opacity-100 md:opacity-0 md:group-hover/hist:opacity-100 md:group-focus-within/hist:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    title={t("history.share")}
                    aria-label={t("history.share")}
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
                    title={t("history.download")}
                    aria-label={t("history.download")}
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
                    title={t("common.actions.delete")}
                    aria-label={t("common.actions.delete")}
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
              ) : null}
            </div>
          );
        })}
      </div>

      <div ref={loadMoreRef} className="flex min-h-10 flex-col items-center gap-3 py-4">
        {hasNextPage ? (
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--lx-gold)]/40 bg-[var(--lx-surface-2)] px-5 text-sm font-medium text-[var(--lx-ink)] transition hover:bg-white disabled:opacity-60"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[var(--lx-gold)]" />
                {t("history.loading")}
              </>
            ) : (
              t("history.loadMore")
            )}
          </button>
        ) : null}
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
                    alt={t("history.createdAlt")}
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
                  title={t("common.actions.delete")}
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
                    {t("history.share")}
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
                    {t("history.download")}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <ShareSheet
        open={Boolean(shareTarget)}
        title={t("history.shareTitle")}
        description={t("result.shareSnapHint")}
        onClose={() => {
          setShareTarget(null);
          cleanupShareUiLocks();
        }}
        onSelect={(platform) => void handleShare(platform)}
      />
    </div>
  );
}
