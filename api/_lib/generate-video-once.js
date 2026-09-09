const { createRunwayVideoTask } = require("./kie-runway");

function readVideoApiCallCount(metadata) {
  const meta = metadata && typeof metadata === "object" ? metadata : {};
  const count = Number(meta.video_api_call_count);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

async function claimVideoProviderCall(supabase, generationId) {
  const { data: row, error: fetchErr } = await supabase
    .from("generations")
    .select("id, user_id, provider_task_id, metadata, provider_attempts")
    .eq("id", generationId)
    .single();
  if (fetchErr) throw fetchErr;

  const count = readVideoApiCallCount(row.metadata);
  if (count >= 1) {
    const taskId = String(row.provider_task_id || "");
    const parts = taskId.split(",").filter(Boolean);
    const videoPart = parts.find((p) => p.startsWith("video_")) || parts[parts.length - 1];
    return { allowed: false, generation: row, apiCallCount: count, externalTaskId: videoPart };
  }

  const nextMeta = {
    ...(row.metadata || {}),
    video_api_call_count: 1,
    video_provider_started_at: new Date().toISOString(),
  };

  const { data: updatedRows, error: updateErr } = await supabase
    .from("generations")
    .update({
      metadata: nextMeta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", generationId)
    .or("metadata->>video_api_call_count.is.null,metadata->>video_api_call_count.eq.0")
    .select("id, user_id, provider_task_id, metadata, provider_attempts");

  if (updateErr) throw updateErr;
  if (!updatedRows || updatedRows.length === 0) {
    const { data: refreshed } = await supabase
      .from("generations")
      .select("id, user_id, provider_task_id, metadata, provider_attempts")
      .eq("id", generationId)
      .single();
    const refreshedCount = readVideoApiCallCount(refreshed?.metadata);
    const parts = String(refreshed?.provider_task_id || "").split(",").filter(Boolean);
    return {
      allowed: false,
      generation: refreshed,
      apiCallCount: refreshedCount,
      externalTaskId: parts.find((p) => p.startsWith("video_")) || null,
    };
  }

  return { allowed: true, generation: updatedRows[0], apiCallCount: 0 };
}

/**
 * Single billable Runway video call per generation row.
 */
async function generateVideoOnce(supabase, params) {
  const claim = await claimVideoProviderCall(supabase, params.generationId);
  if (!claim.allowed) {
    console.info("[generate-video-once] skipped duplicate provider call", {
      generationId: params.generationId,
      apiCallCount: claim.apiCallCount,
    });
    return {
      ok: true,
      deduplicated: true,
      externalTaskId: claim.externalTaskId,
      apiCallCount: claim.apiCallCount,
    };
  }

  const startedAt = Date.now();
  const runway = await createRunwayVideoTask({
    prompt: params.prompt,
    image: params.imageUrl,
    aspectRatio: params.aspectRatio,
    durationSec: params.durationSec,
    quality: params.quality,
  });

  const externalTaskId = `video_${runway.taskId}`;
  const durationMs = Date.now() - startedAt;
  const prevAttempts = Array.isArray(claim.generation.provider_attempts)
    ? claim.generation.provider_attempts
    : [];

  const nextMeta = {
    ...(claim.generation.metadata || {}),
    video_api_call_count: 1,
    video_provider_completed_at: new Date().toISOString(),
    runway_task_id: runway.taskId,
    video_provider_duration_ms: durationMs,
    video_auto_retries: 0,
  };

  await supabase
    .from("generations")
    .update({
      provider: "runway",
      provider_task_id: externalTaskId,
      metadata: nextMeta,
      provider_attempts: [
        ...prevAttempts,
        {
          provider: "runway",
          taskId: runway.taskId,
          externalTaskId,
          durationMs,
          autoRetry: false,
        },
      ],
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.generationId);

  console.info("[generate-video-once] runway job created", {
    generationId: params.generationId,
    videoRequestId: nextMeta.video_request_id || null,
    runwayTaskId: runway.taskId,
    durationMs,
    apiCallCount: 1,
  });

  return {
    ok: true,
    deduplicated: false,
    externalTaskId,
    apiCallCount: 1,
    runwayTaskId: runway.taskId,
    durationMs,
  };
}

module.exports = {
  generateVideoOnce,
  claimVideoProviderCall,
  readVideoApiCallCount,
};
