/** Coûts crédits par action — grille « zéro perte » (pire cas API + Stripe + URSSAF). */
export const IMAGE_CREDIT_COST = 12;
export const VOICE_CREDIT_COST = 8;
export const VOICE_CLONE_CREDIT_COST = 8;
export const VIDEO_FLAT_CREDIT_COST = 60;
export const VIDEO_VOICE_EXTRA_CREDIT = 5;

/**
 * PPCM image (12) + vidéo (60) + voix/clone (8).
 * Chaque quota d’abo/pack est un multiple entier → épuisement possible à 0 crédit
 * (jamais de reste inutilisable type 1–7 cr).
 */
export const CREDIT_CYCLE_UNIT = 120;

export const PLAN_CREDITS = {
  discovery: 240,
  essential: 840,
  ultimate: 1920,
} as const;

export const PLAN_MONTHLY_AMOUNTS_CENTS = {
  discovery: 990,
  essential: 2290,
  ultimate: 4490,
} as const;

/** Images indicatives au paywall (crédits ÷ IMAGE_CREDIT_COST). */
export function planImageAllowance(plan: keyof typeof PLAN_CREDITS): number {
  return PLAN_CREDITS[plan] / IMAGE_CREDIT_COST;
}

/** Vidéos indicatives au paywall (crédits ÷ VIDEO_FLAT_CREDIT_COST). */
export function planVideoAllowance(plan: keyof typeof PLAN_CREDITS): number {
  return PLAN_CREDITS[plan] / VIDEO_FLAT_CREDIT_COST;
}
