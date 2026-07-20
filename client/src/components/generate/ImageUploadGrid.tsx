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
  const isVideoMode = generationMode === "video";
  const accept = isVideoMode
    ? "video/mp4,video/webm,video/quicktime,video/*"
    : "image/jpeg,image/png,image/webp,image/*";
  const dropLabel = isVideoMode ? t("hero.dropVideo") : t("hero.dropImage");
  const singleEmptySlot = images.length === 1 && !images[0];

  return (
    <div className="flex w-full justify-center -mb-7 md:-mb-8">
      <div className="flex w-full max-w-full justify-center overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-end justify-center gap-2 md:gap-3">
          {images.map((img, i) => {
            const isVideoPreview = Boolean(
              img?.file.type.startsWith("video/"),
            );

            return (
              <div
                key={i}
                className="relative aspect-[9/16] h-[min(52vh,440px)] w-auto flex-shrink-0 md:h-[min(58vh,520px)]"
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
                      className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                      type="button"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <label className="group absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-foreground/25 bg-white/80 transition-all">
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
                      {singleEmptySlot ? (
                        <>
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                            <Plus className="h-7 w-7 text-primary transition-colors" />
                          </div>
                          <p className="px-2 text-center text-base font-medium whitespace-nowrap text-muted-foreground transition-colors group-hover:text-foreground md:text-lg">
                            {dropLabel}
                          </p>
                        </>
                      ) : (
                        <Plus className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-foreground" />
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
