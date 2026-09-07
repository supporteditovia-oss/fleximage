/** Une seule génération en cours par utilisateur (image ou vidéo). */
const GENERATION_DEDUP_WINDOW_MS = 90_000;

function extractClientTaskId(providerTaskId) {
  const parts = String(providerTaskId || "")
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || "";
}

async function findRecentInFlightGeneration(supabase, userId) {
  const since = new Date(Date.now() - GENERATION_DEDUP_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("generations")
    .select("id, provider_task_id, metadata, created_at, generation_type")
    .eq("user_id", userId)
    .eq("status", "processing")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

function buildDedupGenerateResponse(inFlight) {
  const existingTaskId = extractClientTaskId(inFlight.provider_task_id);
  const meta =
    inFlight.metadata && typeof inFlight.metadata === "object"
      ? inFlight.metadata
      : {};
  return {
    id: inFlight.id,
    taskId: existingTaskId,
    status: "processing",
    createdAt: inFlight.created_at || null,
    estimatedSeconds:
      meta.estimated_seconds != null &&
      Number.isFinite(Number(meta.estimated_seconds))
        ? Number(meta.estimated_seconds)
        : null,
    deduplicated: true,
    generationType:
      inFlight.generation_type === "video" ? "video" : "image",
  };
}

module.exports = {
  GENERATION_DEDUP_WINDOW_MS,
  extractClientTaskId,
  findRecentInFlightGeneration,
  buildDedupGenerateResponse,
};
