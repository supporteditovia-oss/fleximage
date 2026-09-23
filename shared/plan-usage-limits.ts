/** Quotas mensuels & coûts — marge API (V2V / clone). Miroir api/_lib/plan-usage-limits.js */

export type BillingPlanId =
  | "free"
  | "discovery"
  | "essential"
  | "ultimate"
  | "admin"
  | "unknown";

export type PlanMonthlyQuotas = {
  /** Image → vidéo (5 s) */
  i2vClips: number;
  /** Vidéo → vidéo Motion Control (8 s) — Ultimate surtout */
  v2vClips: number;
  /** Créations de profils clone Fish */
  voiceClones: number;
};

export const PLAN_MONTHLY_QUOTAS: Record<BillingPlanId, PlanMonthlyQuotas> = {
  free: { i2vClips: 0, v2vClips: 0, voiceClones: 0 },
  discovery: { i2vClips: 1, v2vClips: 0, voiceClones: 0 },
  essential: { i2vClips: 3, v2vClips: 0, voiceClones: 1 },
  ultimate: { i2vClips: 10, v2vClips: 5, voiceClones: 3 },
  unknown: { i2vClips: 1, v2vClips: 0, voiceClones: 0 },
  admin: { i2vClips: 9999, v2vClips: 9999, voiceClones: 9999 },
};
