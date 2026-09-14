import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ShareSheet } from "@/components/larp/ShareSheet";
import { useToast } from "@/hooks/use-toast";
import {
  beforeAfterVideoExtension,
  createBeforeAfterVideo,
} from "@/lib/before-after-export";
import {
  cleanupShareUiLocks,
  shareMediaToPlatform,
  type SharePlatform,
} from "@/lib/share-media";

type BeforeAfterShareButtonProps = {
  beforeUrl: string;
  afterUrl: string;
  larpId: string;
};

export function BeforeAfterShareButton({
  beforeUrl,
  afterUrl,
  larpId,
}: BeforeAfterShareButtonProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const ensureVideo = async (): Promise<File | null> => {
    if (videoFile) return videoFile;
    setBusy(true);
    try {
      const blob = await createBeforeAfterVideo({
        beforeUrl,
        afterUrl,
        labels: {
          before: t("result.before"),
          after: t("result.after"),
          brand: "LuxeFlexIA",
        },
      });
      const ext = beforeAfterVideoExtension(blob.type);
      const file = new File([blob], `luxeflexia-transformation-${larpId.slice(0, 8)}.${ext}`, {
        type: blob.type,
      });
      setVideoFile(file);
      return file;
    } catch {
      toast({
        variant: "destructive",
        title: t("result.beforeAfterErrorTitle"),
        description: t("result.beforeAfterErrorHint"),
      });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = async () => {
    const file = await ensureVideo();
    if (file) setOpen(true);
  };

  const handleShare = async (platform: SharePlatform) => {
    const file = videoFile ?? (await ensureVideo());
    if (!file) return;
    setOpen(false);
    cleanupShareUiLocks();

    try {
      const outcome = await shareMediaToPlatform({
        larpId,
        imageIndex: 0,
        assetUrl: afterUrl,
        resultType: "video",
        platform,
        blob: file,
        shareFile: file,
      });
      if (outcome === "saved-guide") {
        toast({
          title: t("result.savedTitle"),
          description: t("result.beforeAfterSavedHint", {
            platform: platform === "tiktok" ? "TikTok" : platform,
          }),
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: t("result.shareFailed"),
        description: t("result.shareFailedHint"),
      });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleOpen()}
        disabled={busy}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--lx-gold)]/90 text-[#1a1408] backdrop-blur-sm transition-all hover:bg-[var(--lx-gold)] active:scale-95 disabled:opacity-60"
        title={t("result.beforeAfterShare")}
      >
        <Sparkles className={`h-5 w-5 ${busy ? "animate-pulse" : ""}`} />
      </button>

      <ShareSheet
        open={open}
        title={t("result.beforeAfterShareTitle")}
        description={t("result.beforeAfterShareHint")}
        onClose={() => setOpen(false)}
        onSelect={(platform) => void handleShare(platform)}
      />
    </>
  );
}
