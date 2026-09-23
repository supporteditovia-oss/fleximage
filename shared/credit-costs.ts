/** Coûts crédits par action — source de vérité client (miroir backend). */
export const IMAGE_CREDIT_COST = 10;
/** TTS — 10 crédits / minute (arrondi supérieur côté API). */
export const VOICE_CREDIT_COST = 10;
/** Fish clone ~0,50 € — minimum ~28 cr Essentiel ; fixé à 30 cr. */
export const VOICE_CLONE_CREDIT_COST = 30;
/** I2V Kling 5 s (~0,39 € API). */
export const VIDEO_I2V_CREDIT_COST = 60;
/** V2V Motion Control 8 s (~1,00 € API) — marge sur Ultimate. */
export const VIDEO_V2V_CREDIT_COST = 95;
/** @deprecated Alias I2V — préférer VIDEO_I2V_CREDIT_COST */
export const VIDEO_FLAT_CREDIT_COST = VIDEO_I2V_CREDIT_COST;
export const VIDEO_VOICE_EXTRA_CREDIT = 5;
