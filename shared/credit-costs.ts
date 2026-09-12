/** Coûts crédits par action — grille « zéro perte » (pire cas API + Stripe + URSSAF). */
export const IMAGE_CREDIT_COST = 12;
export const VOICE_CREDIT_COST = 8;
export const VOICE_CLONE_CREDIT_COST = 8;
export const VIDEO_FLAT_CREDIT_COST = 60;
export const VIDEO_VOICE_EXTRA_CREDIT = 5;

export const PLAN_CREDITS = {
  discovery: 220,
  essential: 900,
  ultimate: 2000,
} as const;

export const PLAN_MONTHLY_AMOUNTS_CENTS = {
  discovery: 990,
  essential: 2290,
  ultimate: 4490,
} as const;

/** Images indicatives au paywall (crédits ÷ IMAGE_CREDIT_COST). */
export function planImageAllowance(plan: keyof typeof PLAN_CREDITS): number {
  return Math.floor(PLAN_CREDITS[plan] / IMAGE_CREDIT_COST);
}

/** Vidéos indicatives au paywall (crédits ÷ VIDEO_FLAT_CREDIT_COST). */
export function planVideoAllowance(plan: keyof typeof PLAN_CREDITS): number {
  return Math.floor(PLAN_CREDITS[plan] / VIDEO_FLAT_CREDIT_COST);
}
