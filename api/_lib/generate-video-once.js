const { createRunwayVideoTask } = require("./kie-runway");
const { createAlephVideoTask } = require("./kie-runway-aleph");
const {
  createKlingMotionTask,
  buildKlingMotionPrompt,
} = require("./kie-kling-motion");

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
    const videoPart =
      parts.find(
        (p) =>
          p.startsWith("video_") ||
          p.startsWith("aleph_") ||
          p.startsWith("kling_"),
      ) || parts[parts.length - 1];
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
      externalTaskId:
        parts.find(
          (p) =>
            p.startsWith("video_") ||
            p.startsWith("aleph_") ||
            p.startsWith("kling_"),
        ) || null,
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

/**
 * Single billable Aleph video-to-video call per generation row.
 */
async function generateVideoV2VOnce(supabase, params) {
  const claim = await claimVideoProviderCall(supabase, params.generationId);
  if (!claim.allowed) {
    console.info("[generate-video-v2v-once] skipped duplicate provider call", {
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
  const aleph = await createAlephVideoTask({
    prompt: params.prompt,
    videoUrl: params.videoUrl,
    aspectRatio: params.aspectRatio,
    referenceImage: params.referenceImage,
  });

  const externalTaskId = `aleph_${aleph.taskId}`;
  const durationMs = Date.now() - startedAt;
  const prevAttempts = Array.isArray(claim.generation.provider_attempts)
    ? claim.generation.provider_attempts
    : [];

  const nextMeta = {
    ...(claim.generation.metadata || {}),
    video_api_call_count: 1,
    video_provider_completed_at: new Date().toISOString(),
    aleph_task_id: aleph.taskId,
    video_provider_duration_ms: durationMs,
    video_auto_retries: 0,
  };

  await supabase
    .from("generations")
    .update({
      provider: "runway_aleph",
      provider_task_id: externalTaskId,
      metadata: nextMeta,
      provider_attempts: [
        ...prevAttempts,
        {
          provider: "runway_aleph",
          taskId: aleph.taskId,
          externalTaskId,
          durationMs,
          autoRetry: false,
        },
      ],
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.generationId);

  console.info("[generate-video-v2v-once] aleph job created", {
    generationId: params.generationId,
    videoRequestId: nextMeta.video_request_id || null,
    alephTaskId: aleph.taskId,
    durationMs,
    apiCallCount: 1,
  });

  return {
    ok: true,
    deduplicated: false,
    externalTaskId,
    apiCallCount: 1,
    alephTaskId: aleph.taskId,
    durationMs,
  };
}

/**
 * Kling 3.0 Motion Control — image + vidéo (mouvements conservés).
 */
async function generateKlingMotionOnce(supabase, params) {
  const claim = await claimVideoProviderCall(supabase, params.generationId);
  if (!claim.allowed) {
    console.info("[generate-kling-once] skipped duplicate provider call", {
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
  const klingPrompt = buildKlingMotionPrompt(params.prompt);
  const kling = await createKlingMotionTask({
    prompt: klingPrompt,
    inputUrls: [params.imageUrl],
    videoUrls: [params.videoUrl],
    characterOrientation: "video",
    mode: params.mode || "720p",
  });

  const externalTaskId = `kling_${kling.taskId}`;
  const durationMs = Date.now() - startedAt;
  const prevAttempts = Array.isArray(claim.generation.provider_attempts)
    ? claim.generation.provider_attempts
    : [];

  const nextMeta = {
    ...(claim.generation.metadata || {}),
    video_api_call_count: 1,
    video_provider_completed_at: new Date().toISOString(),
    kling_task_id: kling.taskId,
    video_provider_duration_ms: durationMs,
    video_auto_retries: 0,
    v2v_provider: "kling_motion",
  };

  await supabase
    .from("generations")
    .update({
      provider: "kling_motion",
      provider_task_id: externalTaskId,
      metadata: nextMeta,
      provider_attempts: [
        ...prevAttempts,
        {
          provider: "kling_motion",
          taskId: kling.taskId,
          externalTaskId,
          durationMs,
          autoRetry: false,
        },
      ],
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.generationId);

  console.info("[generate-kling-once] kling job created", {
    generationId: params.generationId,
    videoRequestId: nextMeta.video_request_id || null,
    klingTaskId: kling.taskId,
    durationMs,
    apiCallCount: 1,
  });

  return {
    ok: true,
    deduplicated: false,
    externalTaskId,
    apiCallCount: 1,
    klingTaskId: kling.taskId,
    durationMs,
  };
}

module.exports = {
  generateVideoOnce,
  generateVideoV2VOnce,
  generateKlingMotionOnce,
  claimVideoProviderCall,
  readVideoApiCallCount,
};
