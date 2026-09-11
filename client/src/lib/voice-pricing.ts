/** Tarifs Voix IA affichés côté client (alignés API). */
export const VOICE_GENERATE_CREDIT_COST = 5;
export const VOICE_CLONE_CREDIT_COST = 10;

/** Coût total avec un extrait perso (clone éphémère + génération, session uniquement). */
export function voiceOwnSampleGenerateCost() {
  return VOICE_CLONE_CREDIT_COST + VOICE_GENERATE_CREDIT_COST;
}
