/** Coûts crédits par action — grille « zéro perte » (pire cas API + Stripe + URSSAF). */
export const IMAGE_CREDIT_COST = 10;
export const VOICE_CREDIT_COST = 10;
export const VOICE_CLONE_CREDIT_COST = 10;
export const VIDEO_FLAT_CREDIT_COST = 60;
export const VIDEO_VOICE_EXTRA_CREDIT = 5;

/**
 * PPCM image (10) + vidéo (60) + voix/clone (10) = 60.
 * Quotas abo/packs = multiples de 60 → épuisement possible à 0 crédit exact.
 */
export const CREDIT_CYCLE_UNIT = 60;

export const PLAN_CREDITS = {
  discovery: 240,
  essential: 840,
  ultimate: 1920,
} as const;

export const PLAN_MONTHLY_AMOUNTS_CENTS = {
  discovery: 1000,
  essential: 2500,
  ultimate: 4900,
} as const;

/** Images indicatives au paywall (crédits ÷ IMAGE_CREDIT_COST). */
export function planImageAllowance(plan: keyof typeof PLAN_CREDITS): number {
  return PLAN_CREDITS[plan] / IMAGE_CREDIT_COST;
}

/** Vidéos indicatives au paywall (crédits ÷ VIDEO_FLAT_CREDIT_COST). */
export function planVideoAllowance(plan: keyof typeof PLAN_CREDITS): number {
  return PLAN_CREDITS[plan] / VIDEO_FLAT_CREDIT_COST;
}

/** Voix TTS indicatives au paywall (crédits ÷ VOICE_CREDIT_COST). */
export function planVoiceAllowance(plan: keyof typeof PLAN_CREDITS): number {
  return PLAN_CREDITS[plan] / VOICE_CREDIT_COST;
}

/** Clones voix indicatifs au paywall (crédits ÷ VOICE_CLONE_CREDIT_COST). */
export function planCloneAllowance(plan: keyof typeof PLAN_CREDITS): number {
  return PLAN_CREDITS[plan] / VOICE_CLONE_CREDIT_COST;
}

export const CREDIT_PACK_AMOUNTS = {
  mini: 60,
  standard: 120,
  plus: 240,
} as const;
