import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ImageUploadGridProps {
  images: ({ url: string; file: File } | null)[];
  onImageSelect: (index: number, file: File) => void;
  onRemoveSlot: (index: number) => void;
  /** Controls drop label + file picker filter (image vs video). */
  generationMode?: "image" | "video";
}

export function ImageUploadGrid({
  images,
  onImageSelect,
  onRemoveSlot,
  generationMode = "image",
}: ImageUploadGridProps) {
  const { t } = useTranslation();
  const uploadedCount = images.filter(Boolean).length;
  const showEmptySlotText = uploadedCount < 2;
  const isVideoMode = generationMode === "video";
  const accept = isVideoMode
    ? "video/mp4,video/webm,video/quicktime,video/*"
    : "image/jpeg,image/png,image/webp,image/*";
  const dropLabel = isVideoMode ? t("hero.dropVideo") : t("hero.dropImage");

  return (
    <div className="w-full flex justify-center -mb-7 md:-mb-8">
      <div className="flex w-full max-w-md flex-col">
        <div className="mx-auto grid w-full max-w-[22rem] grid-cols-3 gap-2 sm:gap-3 md:max-w-[26rem]">
          {images.map((img, i) => {
            const isVideoPreview = Boolean(
              img?.file.type.startsWith("video/"),
            );

            return (
              <div
                key={i}
                className="relative aspect-square w-full min-w-0 overflow-hidden"
              >
                {img ? (
                  <>
                    {isVideoPreview ? (
                      <video
                        src={img.url}
                        className="absolute inset-0 h-full w-full rounded-lg object-cover"
                        muted
                        playsInline
                        loop
                        autoPlay
                        aria-label={t("imageUpload.videoAlt", { index: i + 1 })}
                      />
                    ) : (
                      <img
                        src={img.url}
                        alt={t("imageUpload.imageAlt", { index: i + 1 })}
                        className="absolute inset-0 h-full w-full rounded-lg object-cover"
                      />
                    )}
                    <button
                      onClick={() => onRemoveSlot(i)}
                      className="absolute top-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                      type="button"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <label className="group absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-foreground/25 bg-white/80 transition-all sm:gap-2">
                      <input
                        type="file"
                        accept={accept}
                        className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) {
                            e.currentTarget.value = "";
                            return;
                          }
                          const ok = isVideoMode
                            ? file.type.startsWith("video/")
                            : file.type.startsWith("image/");
                          if (ok) onImageSelect(i, file);
                          e.currentTarget.value = "";
                        }}
                      />
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15 sm:h-12 sm:w-12">
                        <Plus className="h-6 w-6 text-primary transition-colors sm:h-7 sm:w-7" />
                      </div>
                      {showEmptySlotText && (
                        <p className="px-1 text-center text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-foreground sm:text-sm">
                          {dropLabel}
                        </p>
                      )}
                    </label>
                    <span className="hero-image-slot pointer-events-none absolute inset-0 z-10 rounded-lg" />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
