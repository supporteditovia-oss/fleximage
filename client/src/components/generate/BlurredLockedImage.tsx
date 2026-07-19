import { Lock } from "lucide-react";
import { formatPaywallPromptPreview } from "@/lib/paywall-prompt";

interface BlurredLockedImageProps {
  imageUrl?: string | null;
  className?: string;
  /** Stronger blur for the full page preview */
  size?: "page" | "modal";
  /** User prompt echoed near the lock so the request feels acknowledged */
  prompt?: string | null;
}

/** Blurred user photo with padlock — used on /image-prete and in the paywall modal. */
export function BlurredLockedImage({
  imageUrl,
  className = "",
  size = "page",
  prompt = null,
}: BlurredLockedImageProps) {
  const isPage = size === "page";
  const lockBox = isPage ? "h-16 w-16" : "h-10 w-10";
  const lockIcon = isPage ? "h-7 w-7" : "h-4 w-4";
  const promptPreview = prompt?.trim()
    ? formatPaywallPromptPreview(prompt, isPage ? 78 : 42)
    : null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[var(--lx-gold)]/45 bg-black/5 shadow-[0_20px_50px_rgba(18,16,14,0.14)] ${className}`}
    >
      <div className="relative aspect-[9/16] w-full overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Aperçu de ton image verrouillée"
            className={`h-full w-full scale-125 object-cover ${
              isPage ? "blur-[28px]" : "blur-[12px]"
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--lx-surface-2)]">
            <Lock
              className="h-10 w-10 text-[var(--lx-gold)]/50"
              strokeWidth={1.75}
            />
          </div>
        )}

        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,16,14,0.22)_0%,rgba(18,16,14,0.42)_45%,rgba(18,16,14,0.72)_100%)]"
          aria-hidden
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`flex ${lockBox} items-center justify-center rounded-full border border-[var(--lx-gold)]/60 bg-[linear-gradient(135deg,#1a1408_0%,#2a2214_100%)] shadow-[0_10px_28px_rgba(18,16,14,0.4)]`}
          >
            <Lock
              className={`${lockIcon} text-[var(--lx-gold-soft)]`}
              strokeWidth={2.25}
              aria-hidden
            />
          </div>
        </div>

        {promptPreview ? (
          <div
            className={`absolute inset-x-0 bottom-0 ${
              isPage ? "px-3 pb-3 pt-10" : "px-1.5 pb-1.5 pt-6"
            }`}
          >
            <div
              className={`rounded-xl border border-white/15 bg-black/45 text-left shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-md ${
                isPage ? "px-3 py-2.5" : "px-1.5 py-1"
              }`}
            >
              <p
                className={`font-semibold uppercase tracking-[0.12em] text-[var(--lx-gold-soft)] ${
                  isPage ? "text-[10px]" : "text-[8px] leading-tight"
                }`}
              >
                Générée selon ta demande
              </p>
              <p
                className={`mt-0.5 font-medium leading-snug text-white/95 ${
                  isPage ? "text-xs" : "text-[9px] leading-tight"
                }`}
              >
                « {promptPreview} »
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
