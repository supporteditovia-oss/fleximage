const {
  uploadImageUrlsToOneshot,
  createOneshotJob,
  ONESHOT_MODEL_VARIANT,
  isGoogleAiPromptFlagged,
} = require("./oneshot");
const {
  buildLiteralRetryPrompt,
  buildWeaponHardRetryPrompt,
  isWeaponPrompt,
} = require("./prompt-guard");
const {
  resolveImageGenerationProvider,
  isOneshotCreditsExhaustedError,
} = require("./model-router");
const { resolveGenerationsTableProvider } = require("./generation-provider");
const { readApiCallCount } = require("./generation-idempotency");

/** Dernier taskId actif (OneShot ou legacy provider task). */
function extractProviderExternalTaskId(providerTaskId) {
  const parts = String(providerTaskId || "")
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const seg = parts[i];
    if (seg.startsWith("__")) continue;
    if (
      seg.startsWith("custom_") ||
      seg.startsWith("deepinfra_sync_") ||
      seg.length > 0
    ) {
      return seg;
    }
  }
  return parts[parts.length - 1] || null;
}

const extractOneshotExternalTaskId = extractProviderExternalTaskId;

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
      existingTaskId: extractProviderExternalTaskId(row.provider_task_id),
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
 * Point d'entrée unique de génération d'image via OneShot.
 * Politique identique OneShot : au plus UN appel API fournisseur par ligne generation
 * (claim api_call_count) — pas de 2e job auto en fallback ; échec → remboursement site.
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
    const dedupeProvider =
      claim.generation.provider && String(claim.generation.provider).trim()
        ? String(claim.generation.provider).trim()
        : "oneshot";
    return {
      ok: true,
      deduplicated: true,
      externalTaskId: claim.existingTaskId,
      apiCallCount: claim.apiCallCount,
      provider: dedupeProvider,
    };
  }

  const meta =
    claim.generation.metadata && typeof claim.generation.metadata === "object"
      ? claim.generation.metadata
      : {};
  // Reuse completed DeepInfra generations created before the provider migration.
  const deepinfraStoredUrl =
    meta.deepinfra_sync &&
    typeof meta.deepinfra_output_url === "string"
      ? meta.deepinfra_output_url.trim()
      : "";
  const deepinfraTaskId = extractProviderExternalTaskId(
    claim.generation.provider_task_id,
  );
  if (
    deepinfraStoredUrl.startsWith("http") &&
    deepinfraTaskId &&
    deepinfraTaskId.startsWith("deepinfra_sync_")
  ) {
    console.info("[generate-image-once] reusing existing DeepInfra result", {
      generationId,
      externalTaskId: deepinfraTaskId,
      ...logContext,
    });
    return {
      ok: true,
      deduplicated: true,
      externalTaskId: deepinfraTaskId,
      apiCallCount: readApiCallCount(meta),
      provider: "deepinfra",
      outputUrl: deepinfraStoredUrl,
      syncComplete: true,
    };
  }

  const existingJobId =
    typeof meta.oneshot_job_id === "string" && meta.oneshot_job_id.trim()
      ? meta.oneshot_job_id.trim()
      : null;
  if (existingJobId) {
    const externalTaskId = `custom_${existingJobId}`;
    console.info("[generate-image-once] reusing existing oneshot job", {
      generationId,
      oneshotJobId: existingJobId,
      ...logContext,
    });
    return {
      ok: true,
      deduplicated: true,
      externalTaskId,
      apiCallCount: readApiCallCount(meta),
      provider: "oneshot",
    };
  }

  const prevAttempts = Array.isArray(claim.generation.provider_attempts)
    ? claim.generation.provider_attempts
    : [];
  const durationMs = Date.now() - startedAt;

  function mergeProviderTaskId(previous, externalTaskId) {
    const parts = String(previous || "")
      .split(",")
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (parts.includes(externalTaskId)) {
      return parts.join(",");
    }
    const pending = parts.filter((segment) => segment.startsWith("pending_"));
    const merged = [...pending, externalTaskId];
    return merged.length > 0 ? merged.join(",") : externalTaskId;
  }

  async function persistProviderResult({
    provider,
    externalTaskId,
    attemptRecord,
    nextMeta,
    outputAssets,
    terminalStatus,
    finalPromptOverride,
  }) {
    const mergedTaskId = mergeProviderTaskId(
      claim.generation.provider_task_id,
      externalTaskId,
    );
    const patch = {
      provider: resolveGenerationsTableProvider(provider),
      provider_task_id: mergedTaskId,
      metadata: nextMeta,
      provider_attempts: [...prevAttempts, attemptRecord],
      updated_at: new Date().toISOString(),
    };
    if (Array.isArray(outputAssets) && outputAssets.length > 0) {
      patch.output_assets = outputAssets;
      patch.watermarked_assets = [];
    }
    if (terminalStatus === "succeeded" || terminalStatus === "failed") {
      patch.status = terminalStatus;
      patch.completed_at = new Date().toISOString();
    }
    if (typeof finalPromptOverride === "string" && finalPromptOverride.trim()) {
      patch.final_prompt = finalPromptOverride.trim();
    }
    await supabase.from("generations").update(patch).eq("id", generationId);
  }

  async function runOneshot() {
    const referenceFileIds =
      Array.isArray(imageUrls) && imageUrls.length > 0
        ? await uploadImageUrlsToOneshot(imageUrls)
        : [];

    const jobOptions = {
      generationId,
      caller: "generateImageOnce",
      aspectRatio,
      modelVariant,
      ...(referenceFileIds.length > 0 ? { referenceFileIds } : {}),
    };

    const retryPrompts = [finalPrompt];
    const literalRetry = buildLiteralRetryPrompt(finalPrompt);
    if (literalRetry && literalRetry !== finalPrompt) {
      retryPrompts.push(literalRetry);
    }
    if (isWeaponPrompt(finalPrompt)) {
      const weaponRetry = buildWeaponHardRetryPrompt(finalPrompt);
      if (weaponRetry && !retryPrompts.includes(weaponRetry)) {
        retryPrompts.push(weaponRetry);
      }
    }

    let oneshotResponse = null;
    let promptUsed = finalPrompt;
    let autoRetries = 0;
    let lastErr = null;

    for (let i = 0; i < retryPrompts.length; i += 1) {
      try {
        oneshotResponse = await createOneshotJob(retryPrompts[i], jobOptions);
        promptUsed = retryPrompts[i];
        autoRetries = i;
        break;
      } catch (err) {
        lastErr = err;
        if (!isGoogleAiPromptFlagged(err) || i >= retryPrompts.length - 1) {
          throw err;
        }
        console.warn("[generate-image-once] Google safety flag — retrying prompt", {
          generationId,
          attempt: i + 1,
          ...logContext,
        });
      }
    }

    if (!oneshotResponse) {
      throw lastErr || new Error("Invalid response from OneshotAPI");
    }

    if (!oneshotResponse.id) {
      throw new Error("Invalid response from OneshotAPI");
    }

    enforceSingleImageResult(oneshotResponse);

    const externalTaskId = `custom_${oneshotResponse.id}`;
    const attemptRecord = {
      provider: "oneshot",
      jobId: oneshotResponse.id,
      externalTaskId,
      modelVariant,
      requestedAt: claim.generation.metadata?.provider_call_started_at || null,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      autoRetry: autoRetries > 0,
      ...(autoRetries > 0 ? { autoRetryCount: autoRetries } : {}),
    };
    const nextMeta = {
      ...(claim.generation.metadata || {}),
      api_call_count: 1,
      provider_call_completed_at: new Date().toISOString(),
      oneshot_job_id: oneshotResponse.id,
      provider_duration_ms: Date.now() - startedAt,
      provider_auto_retries: autoRetries,
      ...(autoRetries > 0 ? { oneshot_soft_retry: true, final_prompt_used: promptUsed } : {}),
    };

    await persistProviderResult({
      provider: "oneshot",
      externalTaskId,
      attemptRecord,
      nextMeta,
      ...(autoRetries > 0 && promptUsed !== finalPrompt
        ? { finalPromptOverride: promptUsed }
        : {}),
    });

    console.info("[generate-image-once] provider call completed", {
      generationId,
      generationRequestId: nextMeta.generation_request_id || null,
      oneshotJobId: oneshotResponse.id,
      externalTaskId,
      durationMs: Date.now() - startedAt,
      apiCallCount: 1,
      autoRetries,
      ...logContext,
    });

    return {
      ok: true,
      deduplicated: false,
      externalTaskId,
      apiCallCount: 1,
      provider: "oneshot",
      oneshotJobId: oneshotResponse.id,
      durationMs: Date.now() - startedAt,
    };
  }

  const hasReferenceImages =
    Array.isArray(imageUrls) && imageUrls.length > 0;
  const route = await resolveImageGenerationProvider(supabase);

  console.info("[generate-image-once] model-router", {
    generationId,
    provider: route.provider,
    reason: route.reason || null,
    hasReferenceImages,
    ...logContext,
  });

  try {
    return await runOneshot();
  } catch (primaryErr) {
    if (
      route.provider === "oneshot" &&
      isOneshotCreditsExhaustedError(primaryErr)
    ) {
      const retryErr = new Error(
        "Crédits OneShot épuisés — recharge le compte OneShot.",
      );
      retryErr.code = "ONESHOT_CREDITS_EXHAUSTED";
      throw retryErr;
    }
    throw primaryErr;
  }
}

module.exports = {
  generateImageOnce,
  claimProviderApiCall,
  extractOneshotExternalTaskId,
  extractProviderExternalTaskId,
  logCriticalDoubleBilling,
};
