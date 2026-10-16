import {
  LANDSCAPE_ASPECT_RATIO,
  normalizeGenerationAspectRatio,
  OUTPUT_ASPECT_RATIO,
} from "./schema";

export function aspectRatioToCss(aspect: string | undefined | null): string {
  return normalizeGenerationAspectRatio(aspect) === LANDSCAPE_ASPECT_RATIO
    ? "16 / 9"
    : "9 / 16";
}

export function isLandscapeAspectRatio(aspect: string | undefined | null): boolean {
  return normalizeGenerationAspectRatio(aspect) === LANDSCAPE_ASPECT_RATIO;
}

/** Cadre résultat image — portrait 9:16 ou paysage 16:9. */
export function larpResultFrameClass(aspect: string | undefined | null): string {
  if (isLandscapeAspectRatio(aspect)) {
    return "relative aspect-[16/9] h-[min(44svh,380px)] w-auto max-w-[min(92vw,720px)] shrink-0 overflow-hidden rounded-lg bg-black shadow-xl md:h-[min(52svh,440px)]";
  }
  return "relative aspect-[9/16] h-[min(62svh,560px)] w-auto max-w-[92vw] shrink-0 overflow-hidden rounded-lg bg-black shadow-xl md:h-[min(76svh,680px)]";
}

export function larpFullscreenViewerFrameClass(
  aspect: string | undefined | null,
): string {
  if (isLandscapeAspectRatio(aspect)) {
    return "relative mx-auto aspect-[16/9] h-[min(56svh,420px)] w-auto max-w-[min(calc(100vw-2rem),100%)] shrink-0 overflow-hidden rounded-2xl bg-black shadow-2xl";
  }
  return "relative mx-auto aspect-[9/16] h-[min(80svh,calc(100dvh-8rem))] w-auto max-w-[min(calc(100vw-2rem),100%)] shrink-0 overflow-hidden rounded-2xl bg-black shadow-2xl";
}

export { OUTPUT_ASPECT_RATIO, LANDSCAPE_ASPECT_RATIO };
