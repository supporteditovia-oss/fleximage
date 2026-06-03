import { Loader2, ScanFace, X } from "lucide-react";
import { icons } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TemplateIllustrationMedia } from "@/components/templates/TemplateIllustrationMedia";
import { getLocalizedTemplateName } from "@/lib/template-utils";
import type { PromptTemplate } from "@shared/schema";
import { useTranslation } from "react-i18next";

interface TemplateSelectedPanelProps {
  template: PromptTemplate;
  generationMode: "image" | "video";
  requiresFaceCapture: boolean;
  useFaceAsset: boolean;
  onUseFaceAssetChange: (value: boolean) => void;
  faceCaptureReady: boolean;
  faceCaptureLoading: boolean;
  onDeselect: () => void;
  onGenerate: () => void;
  onScanFace: () => void;
  isGenerating: boolean;
}

export function TemplateSelectedPanel({
  template,
  generationMode,
  requiresFaceCapture,
  useFaceAsset,
  onUseFaceAssetChange,
  faceCaptureReady,
  faceCaptureLoading,
  onDeselect,
  onGenerate,
  onScanFace,
  isGenerating,
}: TemplateSelectedPanelProps) {
  const { t, i18n } = useTranslation();
  const templateName = getLocalizedTemplateName(template, i18n.language);
  const iconName = template.icon as keyof typeof icons | undefined;
  const IconComponent =
    iconName && icons[iconName] ? icons[iconName] : null;
  const previewUrl =
    template.example_after_url || template.example_before_url || null;
  const isVideoTemplate =
    template.generation_type === "video" || template.generation_type === "both";

  const faceToggleDisabled = !faceCaptureReady || faceCaptureLoading;
  const hasReferenceImages = (template.reference_image_count ?? 0) > 0;
  const generateBlockedByFace =
    (requiresFaceCapture && !useFaceAsset) ||
    (useFaceAsset && !faceCaptureReady);
  const generateBlocked = generateBlockedByFace || !hasReferenceImages;

  return (
    <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-4">
      <div className="relative aspect-[9/16] h-[min(52vh,440px)] w-full overflow-hidden rounded-lg border-2 border-foreground/25 bg-white/80 shadow-sm">
        <button
          type="button"
          onClick={onDeselect}
          className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75"
          aria-label={t("templateSelected.deselect")}
        >
          <X className="h-4 w-4" />
        </button>

        {previewUrl ? (
          <TemplateIllustrationMedia
            src={previewUrl}
            alt={templateName}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            {IconComponent ? (
              <IconComponent className="h-12 w-12 text-primary/40" />
            ) : null}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 pb-4 pt-16">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
            {t("templateSelected.label")}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {IconComponent ? (
              <IconComponent className="h-5 w-5 shrink-0 text-white" />
            ) : null}
            <p className="truncate text-lg font-bold text-white">{templateName}</p>
          </div>
          <p className="mt-1 text-xs text-white/80">
            {isVideoTemplate && generationMode === "video"
              ? t("templateSelected.modeVideo")
              : t("templateSelected.modeImage")}
          </p>
        </div>
      </div>

      <TooltipProvider delayDuration={200}>
        <div className="flex w-full items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <ScanFace className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Label htmlFor="use-face-asset" className="text-sm font-medium">
              {t("templateSelected.useFace")}
            </Label>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Switch
                  id="use-face-asset"
                  checked={useFaceAsset}
                  onCheckedChange={onUseFaceAssetChange}
                  disabled={faceToggleDisabled}
                />
              </span>
            </TooltipTrigger>
            {faceToggleDisabled && (
              <TooltipContent side="top" className="max-w-[240px]">
                {t("templateSelected.useFaceDisabledTooltip")}
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </TooltipProvider>

      {faceCaptureLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("templateSelected.loadingFace")}
        </div>
      ) : !faceCaptureReady ? (
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={onScanFace}
        >
          <ScanFace className="mr-2 h-4 w-4" />
          {t("generate.scanFace")}
        </Button>
      ) : null}

      {requiresFaceCapture && !useFaceAsset && (
        <p className="text-center text-xs text-destructive px-4">
          {t("templateSelected.faceRequiredForTemplate")}
        </p>
      )}

      {!hasReferenceImages && (
        <p className="text-center text-xs text-destructive px-4">
          {t("templateSelected.noReferenceImages")}
        </p>
      )}

      <Button
        type="button"
        className="h-11 w-full rounded-lg text-sm font-semibold shadow-sm"
        onClick={onGenerate}
        disabled={isGenerating || faceCaptureLoading || generateBlocked}
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("promptInput.creating")}
          </>
        ) : (
          t("templateSelected.generate")
        )}
      </Button>
    </div>
  );
}
