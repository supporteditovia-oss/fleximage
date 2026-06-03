import { Loader2, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface FaceAssetControlsProps {
  idPrefix?: string;
  useFaceAsset: boolean;
  onUseFaceAssetChange: (value: boolean) => void;
  faceCaptureReady: boolean;
  faceCaptureLoading: boolean;
  onScanFace: () => void;
  scanButtonVariant?: "outline" | "pill";
  className?: string;
}

export function FaceAssetControls({
  idPrefix = "use-face-asset",
  useFaceAsset,
  onUseFaceAssetChange,
  faceCaptureReady,
  faceCaptureLoading,
  onScanFace,
  scanButtonVariant = "outline",
  className,
}: FaceAssetControlsProps) {
  const { t } = useTranslation();
  const switchId = `${idPrefix}-switch`;
  const faceToggleDisabled = !faceCaptureReady || faceCaptureLoading;

  return (
    <div className={cn("flex w-full max-w-md flex-col items-center gap-3", className)}>
      <TooltipProvider delayDuration={200}>
        <div className="flex w-full items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <ScanFace className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Label htmlFor={switchId} className="text-sm font-medium">
              {t("templateSelected.useFace")}
            </Label>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Switch
                  id={switchId}
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
        scanButtonVariant === "pill" ? (
          <button
            type="button"
            onClick={onScanFace}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-primary/25 bg-white/80 px-4 text-xs font-semibold text-primary shadow-sm backdrop-blur-md transition-colors hover:bg-primary/10"
          >
            <ScanFace className="h-3.5 w-3.5 shrink-0" />
            {t("generate.scanFace")}
          </button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={onScanFace}
          >
            <ScanFace className="mr-2 h-4 w-4" />
            {t("generate.scanFace")}
          </Button>
        )
      ) : null}
    </div>
  );
}
