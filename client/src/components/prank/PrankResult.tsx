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
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { authFetch } from "@/lib/api";
import { useTranslation } from "react-i18next";

const SHARE_PLATFORMS = [
  {
    id: "whatsapp" as const,
    name: "WhatsApp",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
  {
    id: "snapchat" as const,
    name: "Snapchat",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.947-.225.104-.036.204-.07.3-.096.28-.09.572-.12.81-.036.3.12.48.36.54.636.06.3-.12.576-.33.756-.12.1-.35.243-.705.456-.24.144-.54.288-.735.432a3.12 3.12 0 00-.315.291c-.13.16-.237.381-.237.736 0 .12.06.42.147.66.24.66.48 1.32.66 1.62.3.51.72.9 1.26 1.14.3.12.6.18.87.18h.003c.24 0 .42-.03.567-.084a.76.76 0 01.66.168c.24.204.27.528.12.72-.18.24-.6.516-1.47.69-.06.012-.1.029-.133.058-.1.078-.114.295-.15.45a2.25 2.25 0 01-.075.255c-.12.3-.387.384-.72.432-.36.048-.78.03-1.26.078-.42.042-.84.198-1.35.396-1.68.66-3.15 2.34-5.91 2.34h-.12c-2.76 0-4.23-1.68-5.91-2.34-.51-.198-.93-.354-1.35-.396-.48-.048-.9-.03-1.26-.078-.33-.048-.6-.132-.72-.432a2.25 2.25 0 01-.075-.255c-.036-.15-.05-.37-.15-.45-.033-.029-.073-.046-.133-.058-.87-.174-1.29-.45-1.47-.69-.15-.192-.12-.516.12-.72a.76.76 0 01.66-.168c.147.054.327.084.567.084h.003c.27 0 .57-.06.87-.18.54-.24.96-.63 1.26-1.14.18-.3.42-.96.66-1.62.087-.24.147-.54.147-.66 0-.355-.107-.576-.237-.736a3.12 3.12 0 00-.315-.291c-.195-.144-.495-.288-.735-.432-.355-.213-.585-.356-.705-.456-.21-.18-.39-.456-.33-.756.06-.276.24-.516.54-.636.238-.084.53-.054.81.036.096.026.196.06.3.096.288.105.647.241.947.225.198 0 .326-.045.401-.09a50.99 50.99 0 01-.033-.57c-.104-1.628-.23-3.654.3-4.847C7.86 1.069 11.216.793 12.206.793z" />
      </svg>
    ),
  },
  {
    id: "instagram" as const,
    name: "Instagram",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.882 0 1.441 1.441 0 012.882 0z" />
      </svg>
    ),
  },
  {
    id: "tiktok" as const,
    name: "TikTok",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
];

interface PrankResultProps {
  resultUrls: string[];
  prankId: string;
  hideActions?: boolean;
  resultType?: "image" | "video";
}

export function PrankResult({
  resultUrls,
  prankId,
  hideActions = false,
  resultType = "image",
}: PrankResultProps) {
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

  if (!resultUrls.length) {
    return (
      <p className="text-center text-muted-foreground">{t("result.noImage")}</p>
    );
  }

  async function handleDownload(imageIndex: number) {
    try {
      const res = await authFetch(
        `/api/pranks/${encodeURIComponent(prankId)}/download/${imageIndex}`,
      );
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const isVideo = blob.type.startsWith("video/") || blob.type === "application/octet-stream";
      const ext = isVideo
        ? "mp4"
        : blob.type.includes("png")
          ? "png"
          : blob.type.includes("webp")
            ? "webp"
            : "jpg";
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `prank-${randomSuffix}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast({ title: t("result.downloadError"), variant: "destructive" });
    }
  }

  async function handleShare(
    imageIndex: number,
    platform: "whatsapp" | "snapchat" | "instagram" | "tiktok",
  ) {
    setShareDialog(null);
    if (navigator.share && navigator.canShare) {
      try {
        const res = await authFetch(
          `/api/pranks/${encodeURIComponent(prankId)}/download/${imageIndex}`,
        );
        const blob = await res.blob();
        const file = new File([blob], "prank.jpg", {
          type: blob.type || "image/jpeg",
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          return;
        }
      } catch {
        // Fall through to guide
      }
    }
    const names: Record<string, string> = {
      whatsapp: "WhatsApp",
      snapchat: "Snapchat",
      instagram: "Instagram",
      tiktok: "TikTok",
    };
    setTimeout(() => {
      setShareGuide({ platform: names[platform], imageIndex });
    }, 0);
  }

  return (
    <>
      <div className="flex justify-center gap-4 max-h-full">
        {resultUrls.map((url, index) => (
          <div
            key={index}
            className="relative rounded-lg overflow-hidden max-h-full flex items-center justify-center"
          >
            {resultType === "video" ? (
              <video
                src={url}
                controls
                playsInline
                className="max-h-[55vh] md:max-h-[60vh] max-w-full w-auto object-contain rounded-lg shadow-xl"
              />
            ) : (
              <>
                <img
                  src={url}
                  alt={t("result.generatedAlt", { index: index + 1 })}
                  className="max-h-[55vh] md:max-h-[60vh] max-w-full w-auto object-contain rounded-lg shadow-xl"
                  loading="lazy"
                />
                {/* Bottom gradient with action buttons */}
                {!hideActions && (
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 pb-4 pt-12 bg-gradient-to-t from-black/60 to-transparent rounded-b-lg">
                    <button
                      onClick={() => handleDownload(index)}
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
        ))}
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
                  {t("result.shareDescription")}
                </DrawerDescription>
              </DrawerHeader>
            </div>
            <div className="grid grid-cols-4 gap-2 px-4 pb-6 pt-2">
              {SHARE_PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() =>
                    shareDialog &&
                    handleShare(shareDialog.imageIndex, platform.id)
                  }
                  className="flex flex-col items-center gap-2 rounded-xl p-3 transition-all active:scale-95"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full text-primary shadow-md bg-card border border-border/30">
                    {platform.icon}
                  </div>
                  <span className="text-xs font-medium">{platform.name}</span>
                </button>
              ))}
            </div>
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
            <div className="grid grid-cols-4 gap-3 pt-2">
              {SHARE_PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() =>
                    shareDialog &&
                    handleShare(shareDialog.imageIndex, platform.id)
                  }
                  className="flex flex-col items-center gap-2.5 rounded-xl p-3 transition-all hover:bg-muted active:scale-95"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full text-primary shadow-sm bg-card border border-border/30">
                    {platform.icon}
                  </div>
                  <span className="text-xs font-medium">{platform.name}</span>
                </button>
              ))}
            </div>
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
                  if (shareGuide) {
                    await handleDownload(shareGuide.imageIndex);
                    toast({ title: t("result.imageDownloaded") });
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
                  if (shareGuide) {
                    await handleDownload(shareGuide.imageIndex);
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
