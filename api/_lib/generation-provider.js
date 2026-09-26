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

function resolveVideoGenerationProvider(workflow, v2vProvider) {
  if (workflow !== "video_to_video") return "runway";
  return normalizeProviderForDb(v2vProvider || "kling_motion");
}

module.exports = {
  DB_ALLOWED_PROVIDERS,
  normalizeProviderForDb,
  resolveVideoGenerationProvider,
};
