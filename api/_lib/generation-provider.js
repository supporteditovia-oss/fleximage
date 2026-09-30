/** Values allowed by `generations.provider` check constraint (Supabase). */
const DB_ALLOWED_PROVIDERS = new Set([
  "kie",
  "runway",
  "oneshot",
  "fallback",
  "deepinfra",
  "runway_aleph",
  "kling_motion",
]);

/**
 * Maps internal video provider ids to a DB-safe `generations.provider` value.
 * Detailed provider stays in metadata.v2v_provider and provider_attempts.
 */
function normalizeProviderForDb(provider) {
  const raw = String(provider || "").trim();
  if (!raw) return null;
  if (DB_ALLOWED_PROVIDERS.has(raw)) {
    if (raw === "runway_aleph") return "runway";
    if (raw === "kling_motion") return "kie";
    return raw;
  }
  if (/runway|aleph/i.test(raw)) return "runway";
  if (/kling|kie|motion/i.test(raw)) return "kie";
  return "kie";
}

/**
 * Colonne `generations.provider` — certaines bases prod n'ont pas encore
 * `deepinfra` dans generations_provider_check (migration 20260926023000).
 * On stocke `fallback` + metadata.deepinfra_sync ; le moteur logique reste deepinfra.
 */
function resolveGenerationsTableProvider(provider) {
  const raw = String(provider || "").trim();
  if (!raw) return null;
  if (raw === "deepinfra") return "fallback";
  return normalizeProviderForDb(raw);
}

function resolveVideoGenerationProvider(workflow, v2vProvider) {
  if (workflow !== "video_to_video") return "kie";
  return normalizeProviderForDb(v2vProvider || "kling_motion");
}

module.exports = {
  DB_ALLOWED_PROVIDERS,
  normalizeProviderForDb,
  resolveGenerationsTableProvider,
  resolveVideoGenerationProvider,
};
