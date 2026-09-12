/**
 * Coûts crédits par action — grille « zéro perte » (pire cas API + Stripe + URSSAF).
 * Source de vérité backend ; miroir de shared/credit-costs.ts côté client.
 */
const IMAGE_CREDIT_COST = 12;
const VOICE_CREDIT_COST = 8;
const VOICE_CLONE_CREDIT_COST = 8;
const VIDEO_FLAT_CREDIT_COST = 60;
const VIDEO_VOICE_EXTRA_CREDIT = 5;

/** PPCM image (12) + vidéo (60) + voix/clone (8) — quotas = multiples entiers. */
const CREDIT_CYCLE_UNIT = 120;

const PLAN_CREDITS = {
  discovery: 240,
  essential: 840,
  ultimate: 1920,
};

const PLAN_MONTHLY_AMOUNTS_CENTS = {
  discovery: 990,
  essential: 2290,
  ultimate: 4490,
};

function planImageAllowance(plan) {
  return PLAN_CREDITS[plan] / IMAGE_CREDIT_COST;
}

function planVideoAllowance(plan) {
  return PLAN_CREDITS[plan] / VIDEO_FLAT_CREDIT_COST;
}

module.exports = {
  IMAGE_CREDIT_COST,
  VOICE_CREDIT_COST,
  VOICE_CLONE_CREDIT_COST,
  VIDEO_FLAT_CREDIT_COST,
  VIDEO_VOICE_EXTRA_CREDIT,
  CREDIT_CYCLE_UNIT,
  PLAN_CREDITS,
  PLAN_MONTHLY_AMOUNTS_CENTS,
  planImageAllowance,
  planVideoAllowance,
};
