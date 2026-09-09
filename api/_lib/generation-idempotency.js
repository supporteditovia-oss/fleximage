const { randomUUID } = require("crypto");
const {
  extractClientTaskId,
  findRecentInFlightGeneration,
  isDuplicateKeyError,
} = require("./generation-dedup");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeGenerationRequestId(raw) {
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  if (!id || id.length > 128 || !UUID_RE.test(id)) return null;
  return id;
}

function createGenerationRequestId() {
  return randomUUID();
}

function readApiCallCount(metadata) {
  const meta =
    metadata && typeof metadata === "object" ? metadata : {};
  const count = Number(meta.api_call_count);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function buildIdempotentGenerateResponse(generation, extras = {}) {
  const meta =
    generation.metadata && typeof generation.metadata === "object"
      ? generation.metadata
      : {};
  const taskId = extractClientTaskId(generation.provider_task_id);
  return {
    id: generation.id,
    taskId,
    status:
      generation.status === "succeeded"
        ? "success"
        : generation.status === "failed"
          ? "fail"
          : "processing",
    createdAt: generation.created_at || null,
    estimatedSeconds:
      meta.estimated_seconds != null &&
      Number.isFinite(Number(meta.estimated_seconds))
        ? Number(meta.estimated_seconds)
        : null,
    deduplicated: true,
    generationRequestId: meta.generation_request_id || null,
    apiCallCount: readApiCallCount(meta),
    ...extras,
  };
}

async function findGenerationByRequestId(supabase, generationRequestId) {
  const { data: byColumn, error: columnErr } = await supabase
    .from("generations")
    .select("*")
    .eq("generation_request_id", generationRequestId)
    .maybeSingle();

  if (!columnErr && byColumn) return byColumn;

  const { data: rows, error: metaErr } = await supabase
    .from("generations")
    .select("*")
    .contains("metadata", { generation_request_id: generationRequestId })
    .order("created_at", { ascending: false })
    .limit(1);

  if (metaErr) throw metaErr;
  return rows && rows[0] ? rows[0] : null;
}

/**
 * Resolve an incoming user action to an existing or newly claimed generation row.
 * Returns { kind: "claimed"|"duplicate"|"failed", generation, generationRequestId }
 */
async function claimGenerationRequest(supabase, params) {
  const generationRequestId =
    normalizeGenerationRequestId(params.generationRequestId) ||
    createGenerationRequestId();

  const existing = await findGenerationByRequestId(
    supabase,
    generationRequestId,
  );
  if (existing) {
    if (existing.status === "failed") {
      return { kind: "failed", generation: existing, generationRequestId };
    }
    return { kind: "duplicate", generation: existing, generationRequestId };
  }

  const now = new Date().toISOString();
  const pendingTaskId = `pending_${randomUUID()}`;
  const baseMeta = {
    generation_request_id: generationRequestId,
    api_call_count: 0,
    provider_auto_retries: 0,
    click_count: Number(params.clickCount) > 0 ? Number(params.clickCount) : 1,
    source: params.source || "direct",
    frontend_timestamp: params.frontendTimestamp || null,
    server_claimed_at: now,
    ...(params.extraMetadata || {}),
  };

  const insertRow = {
    user_id: params.userId,
    generation_request_id: generationRequestId,
    template_id: params.templateId || null,
    generation_type: "image",
    prompt: params.prompt,
    final_prompt: params.finalPrompt || params.prompt,
    provider: "oneshot",
    provider_task_id: pendingTaskId,
    status: "processing",
    aspect_ratio: params.aspectRatio,
    input_assets: params.inputAssets || [],
    credit_cost: params.creditCost,
    metadata: baseMeta,
    provider_attempts: [],
    output_assets: [],
    watermarked_assets: [],
  };

  let { data, error } = await supabase
    .from("generations")
    .insert(insertRow)
    .select()
    .single();

  if (
    error &&
    String(error.message || "").includes("generation_request_id")
  ) {
    const { generation_request_id: _drop, ...withoutColumn } = insertRow;
    ({ data, error } = await supabase
      .from("generations")
      .insert(withoutColumn)
      .select()
      .single());
  }

  if (error) {
    if (isDuplicateKeyError(error)) {
      const retry = await findGenerationByRequestId(
        supabase,
        generationRequestId,
      );
      if (retry) {
        if (retry.status === "failed") {
          return { kind: "failed", generation: retry, generationRequestId };
        }
        return { kind: "duplicate", generation: retry, generationRequestId };
      }
      const inFlight = await findRecentInFlightGeneration(
        supabase,
        params.userId,
      );
      if (inFlight) {
        return { kind: "duplicate", generation: inFlight, generationRequestId };
      }
    }
    throw error;
  }

  console.info("[generation-idempotency] claimed", {
    generationRequestId,
    generationId: data.id,
    userId: params.userId,
    source: params.source || "direct",
    clickCount: baseMeta.click_count,
  });

  return { kind: "claimed", generation: data, generationRequestId };
}

module.exports = {
  normalizeGenerationRequestId,
  createGenerationRequestId,
  readApiCallCount,
  buildIdempotentGenerateResponse,
  findGenerationByRequestId,
  claimGenerationRequest,
};
