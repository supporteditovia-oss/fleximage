import { Plus, X, icons } from "lucide-react";
import { useTranslation } from "react-i18next";
import { parseImageSlots } from "@/lib/template-utils";
import type { PromptTemplate } from "@shared/schema";

interface ImageUploadGridProps {
  images: ({ url: string; file: File } | null)[];
  selectedTemplate: PromptTemplate | null;
  onImageSelect: (index: number, file: File) => void;
  onRemoveSlot: (index: number) => void;
  onDeselectTemplate: () => void;
}

export function ImageUploadGrid({
  images,
  selectedTemplate,
  onImageSelect,
  onRemoveSlot,
  onDeselectTemplate,
}: ImageUploadGridProps) {
  const { t } = useTranslation();
  const slots = parseImageSlots(selectedTemplate);

  return (
    <div className="w-full flex justify-center -mb-7 md:-mb-8">
      <div className="flex flex-col w-full max-w-md">
        <div className="flex items-end justify-center gap-2 md:gap-3 w-full">
          {images.map((img, i) => {
            const isRequired = selectedTemplate
              ? (slots[i]?.required ?? false)
              : false;
            const label = slots[i]?.label || "";
            const iconName = selectedTemplate?.icon as keyof typeof icons | undefined;
            const IconComponent = iconName && icons[iconName] ? icons[iconName] : null;

            return (
              <div
                key={i}
                className="relative flex-shrink-1 min-w-0 h-[min(52vh,440px)] md:h-[min(58vh,520px)] aspect-[9/16] flex flex-col"
              >
                {selectedTemplate && i === 0 && (
                  <div className="absolute bottom-full left-0 right-0 pb-2 flex items-end justify-between z-10">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                        {t("imageUpload.template")}
                      </span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        {IconComponent ? (
                          <IconComponent className="w-4 h-4 text-primary shrink-0" />
                        ) : null}
                        <span className="text-base font-bold truncate">
                          {selectedTemplate.name}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={onDeselectTemplate}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors shrink-0"
                      type="button"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {img ? (
                  <>
                    <img
                      src={img.url}
                      alt={t("imageUpload.imageAlt", { index: i + 1 })}
                      className="absolute inset-0 w-full h-full object-cover rounded-2xl"
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
                    {!selectedTemplate && (
                      <span className="hero-image-slot absolute -inset-[2px] rounded-2xl pointer-events-none" />
                    )}
                    {selectedTemplate && (
                      <span className="hero-image-slot--fast absolute -inset-[2px] rounded-2xl pointer-events-none" />
                    )}

                    <label className="group absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 cursor-pointer transition-all border-transparent bg-card">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onImageSelect(i, file);
                        }}
                      />

                      <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors bg-primary/10 group-hover:bg-primary/15">
                        <Plus className="w-7 h-7 transition-colors text-primary" />
                      </div>

                      {selectedTemplate ? (
                        <div className="text-center px-2">
                          <p className="text-[11px] font-semibold text-foreground">
                            {label
                              ? t("imageUpload.photoLabel", { label })
                              : t("imageUpload.dropImage")}
                          </p>
                          <p className="text-[10px] mt-0.5 text-muted-foreground/70">
                            {isRequired
                              ? t("imageUpload.required")
                              : t("imageUpload.optional")}
                          </p>
                        </div>
                      ) : (
                        <p className="text-base md:text-lg font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center px-2 whitespace-nowrap">
                          {t("hero.dropImage")}
                        </p>
                      )}
                    </label>
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
