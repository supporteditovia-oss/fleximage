export const CANTHAL_TILT_NEUTRAL_DEADBAND_DEG = 0.5;

export type CanthalTiltCategory = "positive" | "neutral" | "negative";

export function canthalTiltCategoryFromMeanDegrees(
  meanDeg: number,
): CanthalTiltCategory | null {
  if (!Number.isFinite(meanDeg)) return null;
  if (meanDeg > CANTHAL_TILT_NEUTRAL_DEADBAND_DEG) return "positive";
  if (meanDeg < -CANTHAL_TILT_NEUTRAL_DEADBAND_DEG) return "negative";
  return "neutral";
}
