const {
  uploadImageUrlsToOneshot,
  createOneshotJob,
  ONESHOT_MODEL_VARIANT,
} = require("./oneshot");
const { readApiCallCount } = require("./generation-idempotency");

function extractOneshotExternalTaskId(providerTaskId) {
  const parts = String(providerTaskId || "")
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    if (parts[i].startsWith("custom_")) return parts[i];
  }
  return parts[parts.length - 1] || null;
}

async function logCriticalDoubleBilling(supabase, generation, details) {
  const meta =
    generation.metadata && typeof generation.metadata === "object"
      ? generation.metadata
      : {};
  const payload = {
    level: "critical",
    event: "double_provider_api_call_blocked",
    generationId: generation.id,
    generationRequestId: meta.generation_request_id || null,
    userId: generation.user_id,
    apiCallCount: readApiCallCount(meta),
    ...details,
    timestamp: new Date().toISOString(),
  };
  console.error("[generate-image-once] CRITICAL double billing prevented", payload);

  await supabase
    .from("generations")
    .update({
      metadata: {
        ...meta,
        double_billing_alert: payload,
        updated_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", generation.id)
    .catch((err) => console.error("failed to persist double billing alert", err));
}

/**
 * Atomically claim the single allowed provider API call for this generation.
 */
async function claimProviderApiCall(supabase, generationId) {
  const { data: row, error: fetchErr } = await supabase
    .from("generations")
    .select("id, user_id, provider_task_id, metadata, provider_attempts")
    .eq("id", generationId)
    .single();
  if (fetchErr) throw fetchErr;

  const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const currentCount = readApiCallCount(meta);
  if (currentCount >= 1) {
    return {
      allowed: false,
      generation: row,
      apiCallCount: currentCount,
      existingTaskId: extractOneshotExternalTaskId(row.provider_task_id),
    };
  }

  const nextMeta = {
    ...meta,
    api_call_count: 1,
    provider_call_started_at: new Date().toISOString(),
  };

  const { data: updatedRows, error: updateErr } = await supabase
    .from("generations")
    .update({
      metadata: nextMeta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", generationId)
    .or("metadata->>api_call_count.is.null,metadata->>api_call_count.eq.0")
    .select("id, user_id, provider_task_id, metadata, provider_attempts");

  if (updateErr) throw updateErr;

  if (!updatedRows || updatedRows.length === 0) {
    const { data: refreshed } = await supabase
      .from("generations")
      .select("id, user_id, provider_task_id, metadata, provider_attempts")
      .eq("id", generationId)
      .single();
    const refreshedCount = readApiCallCount(refreshed?.metadata);
    return {
      allowed: false,
      generation: refreshed,
      apiCallCount: refreshedCount,
      existingTaskId: extractOneshotExternalTaskId(refreshed?.provider_task_id),
    };
  }

  return { allowed: true, generation: updatedRows[0], apiCallCount: 0 };
}

function enforceSingleImageResult(oneshotResponse) {
  const outputs = Array.isArray(oneshotResponse?.outputs)
    ? oneshotResponse.outputs
    : Array.isArray(oneshotResponse?.images)
      ? oneshotResponse.images
      : null;
  if (outputs && outputs.length > 1) {
    console.error("[generate-image-once] provider returned multiple images", {
      count: outputs.length,
      jobId: oneshotResponse?.id || null,
    });
  }
}

/**
 * Official single entry point for billable Nano Banana 2 / OneShot image generation.
 * Guarantees at most ONE provider API call per generation row.
 */
async function generateImageOnce(supabase, params) {
  const {
    generationId,
    finalPrompt,
    aspectRatio,
    imageUrls,
    modelVariant = ONESHOT_MODEL_VARIANT,
    logContext = {},
  } = params;

  const startedAt = Date.now();
  const claim = await claimProviderApiCall(supabase, generationId);

  if (!claim.allowed) {
    if (claim.apiCallCount > 1) {
      await logCriticalDoubleBilling(supabase, claim.generation, {
        reason: "api_call_count_exceeded",
        blockedAt: "generateImageOnce",
        ...logContext,
      });
    }
    console.info("[generate-image-once] skipped duplicate provider call", {
      generationId,
      apiCallCount: claim.apiCallCount,
      existingTaskId: claim.existingTaskId,
      ...logContext,
    });
    return {
      ok: true,
      deduplicated: true,
      externalTaskId: claim.existingTaskId,
      apiCallCount: claim.apiCallCount,
      provider: "oneshot",
    };
  }

  const referenceFileIds =
    Array.isArray(imageUrls) && imageUrls.length > 0
      ? await uploadImageUrlsToOneshot(imageUrls)
      : [];

  const oneshotResponse = await createOneshotJob(finalPrompt, {
    aspectRatio,
    modelVariant,
    ...(referenceFileIds.length > 0 ? { referenceFileIds } : {}),
  });

  if (!oneshotResponse || !oneshotResponse.id) {
    throw new Error("Invalid response from OneshotAPI");
  }

  enforceSingleImageResult(oneshotResponse);

  const externalTaskId = `custom_${oneshotResponse.id}`;
  const durationMs = Date.now() - startedAt;
  const prevAttempts = Array.isArray(claim.generation.provider_attempts)
    ? claim.generation.provider_attempts
    : [];
  const attemptRecord = {
    provider: "oneshot",
    jobId: oneshotResponse.id,
    externalTaskId,
    modelVariant,
    requestedAt: claim.generation.metadata?.provider_call_started_at || null,
    completedAt: new Date().toISOString(),
    durationMs,
    autoRetry: false,
  };

  const nextMeta = {
    ...(claim.generation.metadata || {}),
    api_call_count: 1,
    provider_call_completed_at: new Date().toISOString(),
    oneshot_job_id: oneshotResponse.id,
    provider_duration_ms: durationMs,
    provider_auto_retries: 0,
  };

  await supabase
    .from("generations")
    .update({
      provider: "oneshot",
      provider_task_id: externalTaskId,
      metadata: nextMeta,
      provider_attempts: [...prevAttempts, attemptRecord],
      updated_at: new Date().toISOString(),
    })
    .eq("id", generationId);

  console.info("[generate-image-once] provider call completed", {
    generationId,
    generationRequestId: nextMeta.generation_request_id || null,
    oneshotJobId: oneshotResponse.id,
    externalTaskId,
    durationMs,
    apiCallCount: 1,
    autoRetries: 0,
    ...logContext,
  });

  return {
    ok: true,
    deduplicated: false,
    externalTaskId,
    apiCallCount: 1,
    provider: "oneshot",
    oneshotJobId: oneshotResponse.id,
    durationMs,
  };
}

module.exports = {
  generateImageOnce,
  claimProviderApiCall,
  extractOneshotExternalTaskId,
  logCriticalDoubleBilling,
};
