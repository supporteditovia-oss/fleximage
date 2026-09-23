/**
 * Routeur image LuxeFlexIA V2 — parité avec api/_lib/model-router.js (prod Vercel).
 */
export {
  APP_SETTINGS_CREDITS_KEY,
  getOneshotRemainingCredits,
  decrementOneshotCreditIfTracked,
  resolveImageGenerationProvider,
} from "../../api/_lib/model-router.js";

export type ImageGenerationProvider = "oneshot" | "deepinfra" | "kie";
