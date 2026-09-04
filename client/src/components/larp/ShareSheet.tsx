import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SharePlatformGrid } from "@/components/larp/SharePlatformGrid";
import { cleanupShareUiLocks, type SharePlatform } from "@/lib/share-media";

type ShareSheetProps = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onSelect: (platform: SharePlatform) => void;
};

/**
 * Share picker WITHOUT a dark modal overlay.
 * The Vaul Drawer black scrim was the "black block" stuck under the OS share sheet.
 */
export function ShareSheet({
  open,
  title,
  description,
  onClose,
  onSelect,
}: ShareSheetProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("result.shareTitle");
  const resolvedDescription = description ?? t("result.shareSnapHint");

  if (!open) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[200] flex items-end justify-center">
      {/* Transparent dismiss layer — NOT black */}
      <button
        type="button"
        aria-label={t("history.close")}
        className="pointer-events-auto absolute inset-0 bg-transparent"
        onClick={() => {
          onClose();
          cleanupShareUiLocks();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={resolvedTitle}
        className="pointer-events-auto relative z-10 w-full max-w-lg rounded-t-2xl border border-border/60 bg-background px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.18)]"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted" />
        <div className="relative mb-1 text-center">
          <button
            type="button"
            onClick={() => {
              onClose();
              cleanupShareUiLocks();
            }}
            className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-base font-semibold text-foreground">{resolvedTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{resolvedDescription}</p>
        </div>
        <SharePlatformGrid
          className="px-0 pb-2 pt-3"
          onSelect={(platform) => {
            onSelect(platform);
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
