/** Grille v2 — activer après création des Price IDs Stripe (PRICING_V2_ENABLED=1). */
function isPricingV2Enabled() {
  return String(process.env.PRICING_V2_ENABLED || "").trim() === "1";
}

module.exports = { isPricingV2Enabled };
