import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ImageUploadGridProps {
  images: ({ url: string; file: File } | null)[];
  onImageSelect: (index: number, file: File) => void;
  onRemoveSlot: (index: number) => void;
}

export function ImageUploadGrid({
  images,
  onImageSelect,
  onRemoveSlot,
}: ImageUploadGridProps) {
  const { t } = useTranslation();
  const uploadedCount = images.filter(Boolean).length;
  const showEmptySlotText = uploadedCount < 2;

  return (
    <div className="w-full flex justify-center -mb-7 md:-mb-8">
      <div className="flex flex-col w-full max-w-md">
        <div className="flex items-end justify-center gap-2 md:gap-3 w-full">
          {images.map((img, i) => (
            <div
              key={i}
              className="relative flex-shrink-1 min-w-0 h-[min(52vh,440px)] md:h-[min(58vh,520px)] aspect-[9/16] flex flex-col"
            >
              {img ? (
                <>
                  <img
                    src={img.url}
                    alt={t("imageUpload.imageAlt", { index: i + 1 })}
                    className="absolute inset-0 w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={() => onRemoveSlot(i)}
                    className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                    type="button"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <label className="group absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg border-2 cursor-pointer transition-all border-foreground/25 bg-white/80">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onImageSelect(i, file);
                      }}
                    />
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors bg-primary/10 group-hover:bg-primary/15">
                      <Plus className="w-7 h-7 transition-colors text-primary" />
                    </div>
                    {showEmptySlotText && (
                      <p className="text-base md:text-lg font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center px-2 whitespace-nowrap">
                        {t("hero.dropImage")}
                      </p>
                    )}
                  </label>
                  <span className="hero-image-slot absolute inset-0 z-10 rounded-lg pointer-events-none" />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
