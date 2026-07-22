import { Download, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { authFetch } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { VideoResultPlayer } from "@/components/larp/VideoResultPlayer";
import {
  assertMediaBlob,
  inferDownloadExtension,
  randomLarpDownloadName,
  saveMediaBlob,
} from "@/lib/download-media";
import { SharePlatformGrid } from "@/components/larp/SharePlatformGrid";
import {
  fetchShareBlob,
  shareMediaToPlatform,
  type SharePlatform,
} from "@/lib/share-media";

/** Compact media frame used by the generated result surface. */
export const LARP_RESULT_FRAME_CLASS =
  "relative aspect-[9/16] h-[min(62svh,560px)] w-auto max-w-[92vw] shrink-0 overflow-hidden rounded-lg bg-black shadow-xl md:h-[min(76svh,680px)]";

/** Fullscreen portal viewer — same height-first 9:16 constraint */
export const LARP_FULLSCREEN_VIEWER_FRAME_CLASS =
  "relative mx-auto aspect-[9/16] h-[min(80svh,calc(100dvh-8rem))] w-auto max-w-[min(calc(100vw-2rem),100%)] shrink-0 overflow-hidden rounded-2xl bg-black shadow-2xl";

const RESULT_MEDIA_CLASS =
  "absolute inset-0 h-full w-full object-cover";
const RESULT_ACTIONS_CLASS =
  "absolute inset-x-0 bottom-0 z-[60] flex items-center justify-center gap-3 rounded-b-[inherit] bg-gradient-to-t from-black/70 via-black/35 to-transparent px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-14";

function isVideoResultUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
}

interface LarpResultProps {
  resultUrls: string[];
  larpId: string;
  hideActions?: boolean;
  resultType?: "image" | "video";
  /** Reference / input image used as poster for video results */
  posterUrl?: string;
}

export function LarpResult({
  resultUrls,
  larpId,
  hideActions = false,
  resultType = "image",
  posterUrl,
}: LarpResultProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [shareDialog, setShareDialog] = useState<{ imageIndex: number } | null>(
    null,
  );
  const [shareGuide, setShareGuide] = useState<{
    platform: string;
    imageIndex: number;
  } | null>(null);
  const [prefetchedBlob, setPrefetchedBlob] = useState<Blob | null>(null);

  // Prefetch as soon as the result is shown so Snapchat share stays in the tap gesture.
  useEffect(() => {
    if (!resultUrls[0] || !larpId) return;
    let cancelled = false;
    void fetchShareBlob(larpId, 0, resultUrls[0])
      .then((blob) => {
        if (!cancelled) setPrefetchedBlob(blob);
      })
      .catch(() => {
        /* ignore — will fetch on share */
      });
    return () => {
      cancelled = true;
    };
  }, [larpId, resultUrls]);

  useEffect(() => {
    if (!shareDialog) return;
    let cancelled = false;
    void fetchShareBlob(
      larpId,
      shareDialog.imageIndex,
      resultUrls[shareDialog.imageIndex],
    )
      .then((blob) => {
        if (!cancelled) setPrefetchedBlob(blob);
      })
      .catch(() => {
        if (!cancelled) setPrefetchedBlob(null);
      });
    return () => {
      cancelled = true;
    };
  }, [shareDialog, larpId, resultUrls]);

  if (!resultUrls.length) {
    return (
      <p className="text-center text-muted-foreground">{t("result.noImage")}</p>
    );
  }

  async function handleDownload(imageIndex: number): Promise<boolean> {
    const assetUrl = resultUrls[imageIndex];
    const isVideo =
      resultType === "video" ||
      (assetUrl ? isVideoResultUrl(assetUrl) : false);

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

      if (!blob && assetUrl) {
        const res = await fetch(assetUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        blob = await res.blob();
        assertMediaBlob(blob);
      }

      if (!blob) throw new Error("empty");

      const ext = inferDownloadExtension(blob, {
        resultType: isVideo ? "video" : "image",
        url: assetUrl,
      });
      const outcome = await saveMediaBlob(blob, randomLarpDownloadName(ext), {
        resultType: isVideo ? "video" : "image",
        fallbackUrl: assetUrl,
      });
      if (outcome === "aborted") return false;
      return true;
    } catch {
      toast({ title: t("result.downloadError"), variant: "destructive" });
      return false;
    }
  }

  async function handleShare(imageIndex: number, platform: SharePlatform) {
    setShareDialog(null);
    const names: Record<SharePlatform, string> = {
      whatsapp: "WhatsApp",
      snapchat: "Snapchat",
      instagram: "Instagram",
      tiktok: "TikTok",
    };
    try {
      const outcome = await shareMediaToPlatform({
        larpId,
        imageIndex,
        assetUrl: resultUrls[imageIndex],
        resultType,
        platform,
        blob: prefetchedBlob,
      });
      if (outcome === "cancelled" || outcome === "shared" || outcome === "opened-app") {
        return;
      }
      if (outcome === "saved-guide") {
        setTimeout(() => {
          setShareGuide({ platform: names[platform], imageIndex });
        }, 0);
      }
    } catch {
      setTimeout(() => {
        setShareGuide({ platform: names[platform], imageIndex });
      }, 0);
    }
  }

  return (
    <>
      <div className="flex min-h-0 min-w-0 max-w-full shrink items-center justify-center gap-4">
        {resultUrls.map((url, index) => {
          const isVideo = resultType === "video" || isVideoResultUrl(url);

          return (
            <div
              key={index}
              className={LARP_RESULT_FRAME_CLASS}
            >
              {isVideo ? (
                <>
                  <VideoResultPlayer
                    src={url}
                    poster={posterUrl}
                    objectFit="cover"
                    controls={false}
                  />
                  {!hideActions && (
                    <div className={RESULT_ACTIONS_CLASS}>
                      <button
                        onClick={() => void handleDownload(index)}
                        className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 active:scale-95 transition-all"
                        title={t("result.download")}
                      >
                        <Download className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setShareDialog({ imageIndex: index })}
                        className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 active:scale-95 transition-all"
                        title={t("result.share")}
                      >
                        <Share2 className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <img
                    src={url}
                    alt={t("result.generatedAlt", { index: index + 1 })}
                    className={RESULT_MEDIA_CLASS}
                    loading="lazy"
                  />
                  {!hideActions && (
                    <div className={RESULT_ACTIONS_CLASS}>
                      <button
                        onClick={() => void handleDownload(index)}
                        className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 active:scale-95 transition-all"
                        title={t("result.download")}
                      >
                        <Download className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setShareDialog({ imageIndex: index })}
                        className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 active:scale-95 transition-all"
                        title={t("result.share")}
                      >
                        <Share2 className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Share platform picker — same as history */}
      {isMobile ? (
        <Drawer
          open={!!shareDialog}
          onOpenChange={(open) => !open && setShareDialog(null)}
        >
          <DrawerContent>
            <div className="relative">
              <button
                onClick={() => setShareDialog(null)}
                className="absolute top-0 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <DrawerHeader className="text-center">
                <DrawerTitle>{t("result.shareTitle")}</DrawerTitle>
                <DrawerDescription>
                  Choisis Snapchat : la photo est déjà attachée, tu n&apos;as plus qu&apos;à l&apos;envoyer.
                </DrawerDescription>
              </DrawerHeader>
            </div>
            <SharePlatformGrid
              className="px-4 pb-6 pt-2"
              onSelect={(platform) => {
                if (shareDialog) void handleShare(shareDialog.imageIndex, platform);
              }}
            />
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={!!shareDialog}
          onOpenChange={(open) => !open && setShareDialog(null)}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center">
                {t("result.shareTitle")}
              </DialogTitle>
              <DialogDescription className="text-center">
                {t("result.shareDescription")}
              </DialogDescription>
            </DialogHeader>
            <SharePlatformGrid
              className="gap-3 pt-2"
              iconClassName="h-12 w-12 shadow-sm"
              onSelect={(platform) => {
                if (shareDialog) void handleShare(shareDialog.imageIndex, platform);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Share guide fallback */}
      {!isMobile ? (
        <Dialog
          open={!!shareGuide}
          onOpenChange={(open) => !open && setShareGuide(null)}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {t("result.sendTo", { platform: shareGuide?.platform })}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t("result.shareInstructionsLabel")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("result.shareInstructionsIntro")}
              </p>
              <ol className="text-sm space-y-2 list-decimal list-inside">
                <li>{t("result.shareStep1")}</li>
                <li>
                  {t("result.shareStep2", { platform: shareGuide?.platform })}
                </li>
                <li>{t("result.shareStep3")}</li>
              </ol>
              <Button
                className="w-full rounded-full"
                onClick={async () => {
                  if (!shareGuide) return;
                  const ok = await handleDownload(shareGuide.imageIndex);
                  if (ok) {
                    toast({ title: t("result.imageDownloaded") });
                    setShareGuide(null);
                  }
                }}
              >
                <Download className="mr-1.5 h-4 w-4" />
                {t("result.downloadImage")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer
          open={!!shareGuide}
          onOpenChange={(open) => !open && setShareGuide(null)}
        >
          <DrawerContent>
            <div className="relative">
              <button
                onClick={() => setShareGuide(null)}
                className="absolute top-0 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <DrawerHeader className="text-center">
                <DrawerTitle>
                  {t("result.sendTo", { platform: shareGuide?.platform })}
                </DrawerTitle>
                <DrawerDescription className="sr-only">
                  {t("result.shareInstructionsLabel")}
                </DrawerDescription>
              </DrawerHeader>
            </div>
            <div className="space-y-4 px-4 pb-6">
              <p className="text-sm text-muted-foreground">
                {t("result.shareInstructionsIntro")}
              </p>
              <ol className="text-sm space-y-2 list-decimal list-inside">
                <li>{t("result.shareStep1")}</li>
                <li>
                  {t("result.shareStep2", { platform: shareGuide?.platform })}
                </li>
                <li>{t("result.shareStep3")}</li>
              </ol>
              <Button
                className="w-full rounded-full"
                onClick={async () => {
                  if (!shareGuide) return;
                  const ok = await handleDownload(shareGuide.imageIndex);
                  if (ok) {
                    toast({ title: t("result.imageDownloaded") });
                    setShareGuide(null);
                  }
                }}
              >
                <Download className="mr-1.5 h-4 w-4" />
                {t("result.downloadImage")}
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
