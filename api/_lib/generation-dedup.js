/** Une seule génération en cours par utilisateur (image ou vidéo). */
const GENERATION_DEDUP_WINDOW_MS = 120_000;
/** Fenêtre stricte anti double-clic (requêtes concurrentes avec requestId différent). */
const SESSION_BURST_WINDOW_MS = 5_000;

function extractClientTaskId(providerTaskId) {
  const parts = String(providerTaskId || "")
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || "";
}

async function findRecentInFlightGeneration(
  supabase,
  userId,
  windowMs = GENERATION_DEDUP_WINDOW_MS,
) {
  const since = new Date(Date.now() - windowMs).toISOString();
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

function isDuplicateKeyError(error) {
  const code = String(error && error.code ? error.code : "");
  const message = String(error && error.message ? error.message : "").toLowerCase();
  return (
    code === "23505" ||
    message.includes("duplicate key") ||
    message.includes("unique constraint")
  );
}

/**
 * Reserve a processing slot immediately (before slow upload/prompt work).
 * Returns { ok: true, larp } or { ok: false, inFlight }.
 */
async function reserveGenerationSlot(supabase, row) {
  const inFlight = await findRecentInFlightGeneration(supabase, row.user_id);
  if (inFlight) {
    return { ok: false, inFlight };
  }

  const { data, error } = await supabase
    .from("generations")
    .insert(row)
    .select()
    .single();

  if (error) {
    if (isDuplicateKeyError(error)) {
      const retry = await findRecentInFlightGeneration(supabase, row.user_id);
      if (retry) {
        return { ok: false, inFlight: retry };
      }
    }
    throw error;
  }

  return { ok: true, larp: data };
}

module.exports = {
  GENERATION_DEDUP_WINDOW_MS,
  SESSION_BURST_WINDOW_MS,
  extractClientTaskId,
  findRecentInFlightGeneration,
  buildDedupGenerateResponse,
  isDuplicateKeyError,
  reserveGenerationSlot,
};
