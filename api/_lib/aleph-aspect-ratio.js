/** Ratios supportés par Runway Aleph (Kie). */
const ALEPH_ASPECTS = new Set(["16:9", "9:16", "4:3", "3:4", "1:1", "21:9"]);

function pickAlephAspectFromDimensions(width, height, fallback = "16:9") {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return normalizeAlephAspect(fallback);
  }
  const ratio = w / h;
  if (ratio >= 2.15) return "21:9";
  if (ratio >= 1.2) return "16:9";
  if (ratio >= 1.05) return "4:3";
  if (ratio <= 0.6) return "9:16";
  if (ratio <= 0.85) return "3:4";
  if (ratio <= 0.98) return "1:1";
  return "16:9";
}

function normalizeAlephAspect(value, fallback = "16:9") {
  const v = String(value || "").trim();
  return ALEPH_ASPECTS.has(v) ? v : fallback;
}

/**
 * POV habitacle : l’UI est souvent en 9:16 alors que le clip iPhone est en paysage → échecs Kie.
 */
function resolveAlephAspectForV2V({
  userAspect,
  detectedAspect,
  vehiclePov = false,
}) {
  /** POV habitacle : ne jamais laisser la détection 9:16 écraser — Aleph/Kie plante souvent. */
  if (vehiclePov) {
    return "16:9";
  }
  if (detectedAspect) {
    return normalizeAlephAspect(detectedAspect, "16:9");
  }
  return normalizeAlephAspect(userAspect, "9:16");
}

module.exports = {
  ALEPH_ASPECTS,
  pickAlephAspectFromDimensions,
  normalizeAlephAspect,
  resolveAlephAspectForV2V,
};
