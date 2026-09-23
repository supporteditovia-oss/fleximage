/**
 * Grille tarifaire v2 (9,90 / 24,90 / 49,90 € + packs thématiques).
 * Désactivée par défaut — activer uniquement après création des Price IDs Stripe.
 */
export function isPricingV2Enabled(): boolean {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return String(import.meta.env.VITE_PRICING_V2_ENABLED || "").trim() === "1";
  }
  return false;
}
