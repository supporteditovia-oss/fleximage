import { useEffect, useRef, type ChangeEvent } from "react";
import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ImageUploadGridProps {
  images: ({ url: string; file: File } | null)[];
  onImageSelect: (index: number, file: File) => void;
  onRemoveSlot: (index: number) => void;
  /** Controls drop label + file picker filter (image vs video). */
  generationMode?: "image" | "video";
}

/**
 * Mobile: horizontal swipe row (multi-slot aligned left).
 * Desktop: 1–3 cards centered in the viewport.
 */
export function ImageUploadGrid({
  images,
  onImageSelect,
  onRemoveSlot,
  generationMode = "image",
}: ImageUploadGridProps) {
  const { t } = useTranslation();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const prevCountRef = useRef(images.length);
  const isVideoMode = generationMode === "video";
  const accept = isVideoMode
    ? "video/mp4,video/webm,video/quicktime,video/*"
    : "image/jpeg,image/png,image/webp,image/*";
  const dropLabel = isVideoMode ? t("hero.dropVideo") : t("hero.dropImage");
  const singleEmptySlot = images.length === 1 && !images[0];
  const multi = images.length > 1;

  useEffect(() => {
    const el = scrollerRef.current;
    const prev = prevCountRef.current;
    prevCountRef.current = images.length;
    if (!el) return;
    // Mobile only: pin to start when a 2nd/3rd slot appears.
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile && images.length > 1 && prev <= images.length) {
      el.scrollLeft = 0;
    }
  }, [images.length]);

  const openFilePicker = (index: number) => {
    fileInputRefs.current[index]?.click();
  };

  const onFileChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;
    const ok = isVideoMode
      ? file.type.startsWith("video/")
      : file.type.startsWith("image/");
    if (ok) onImageSelect(index, file);
  };

  return (
    <div className="lx-upload-wrap relative z-[15] w-full min-w-0">
      <div
        ref={scrollerRef}
        className="lx-upload-scroller"
        data-multi={multi ? "true" : "false"}
      >
        <div className="lx-upload-row">
          {images.map((img, i) => {
            const isVideoPreview = Boolean(
              img?.file.type.startsWith("video/"),
            );

            return (
              <div key={i} className="lx-upload-slot" data-upload-slot={i}>
                <input
                  ref={(el) => {
                    fileInputRefs.current[i] = el;
                  }}
                  type="file"
                  accept={accept}
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => onFileChange(i, e)}
                />

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
                        draggable={false}
                        aria-label={t("imageUpload.videoAlt", {
                          index: i + 1,
                        })}
                      />
                    ) : (
                      <img
                        src={img.url}
                        alt={t("imageUpload.imageAlt", { index: i + 1 })}
                        className="absolute inset-0 h-full w-full rounded-lg object-cover"
                        draggable={false}
                      />
                    )}
                    <button
                      onClick={() => onRemoveSlot(i)}
                      className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                      type="button"
                      aria-label={t("common.actions.remove", {
                        defaultValue: "Supprimer",
                      })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => openFilePicker(i)}
                      className="group absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-foreground/25 bg-white/80 transition-all"
                    >
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
                    </button>
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
