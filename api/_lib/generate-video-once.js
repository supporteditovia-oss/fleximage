const { createAiAvatarProTask } = require("./kie-ai-avatar-pro");
const { createKlingOmniRef2VTask } = require("./kie-kling-omni-ref2v");
const {
  createAlephVideoTask,
  createAlephVideoTaskLegacy,
} = require("./kie-runway-aleph");
const { countAlephJobsInProviderTaskId } = require("./v2v-aleph-attempts");
const {
  createKlingMotionTask,
  buildKlingMotionPrompt,
} = require("./kie-kling-motion");
const { normalizeProviderForDb } = require("./generation-provider");
const { resolveAlephSourceVideoUrl } = require("./prepare-aleph-source-video");
const { resolveAlephAspectForV2V } = require("./aleph-aspect-ratio");
const { isVehicleDrivingPrompt } = require("./video-studio");
const { ensureKieAccessibleMediaUrl } = require("./kie-file-upload");

function readVideoApiCallCount(metadata) {
  const meta = metadata && typeof metadata === "object" ? metadata : {};
  const count = Number(meta.video_api_call_count);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

/**
 * CRITICAL: append the new provider taskId to the existing `provider_task_id`
 * chain instead of overwriting it. The client polls GET /status with the
 * ORIGINAL `pending_<uuid>` it received from the generate-video response and
 * never updates that id afterwards. status.js finds the row via
 * `ilike provider_task_id %taskId%` + a comma-segment check — if we replace
 * `pending_<uuid>` with `aleph_<kieId>` here, that original id disappears
 * from the column and every subsequent client poll 404s forever (row
 * "disparaît" from the client's point of view even though it keeps
 * processing/succeeding server-side). Keeping a comma-joined history
 * (`pending_<uuid>,aleph_<kieId>`) keeps the original id matchable for the
 * whole lifetime of the generation.
 */
function appendProviderTaskId(prevTaskId, externalTaskId) {
  const prev = String(prevTaskId || "").trim();
  const next = String(externalTaskId || "").trim();
  if (!next) return prev;
  const parts = prev
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.includes(next)) return parts.join(",");
  return [...parts, next].join(",");
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
          p.startsWith("avatar_") ||
          p.startsWith("aleph_") ||
          p.startsWith("kling_") ||
          p.startsWith("omni_") ||
          p.startsWith("seedance_"),
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
            p.startsWith("avatar_") ||
            p.startsWith("aleph_") ||
            p.startsWith("kling_") ||
            p.startsWith("omni_") ||
          p.startsWith("seedance_"),
        ) || null,
    };
  }

  return { allowed: true, generation: updatedRows[0], apiCallCount: 0 };
}

/**
 * Image → Vidéo via Kling Ai Avatar Pro (Kie jobs).
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
  console.info("[generate-video-once] ai-avatar-pro kickoff", {
    generationId: params.generationId,
    imageHost: String(params.imageUrl || "").split("/").slice(-1)[0],
    audioHost: String(params.audioUrl || "").split("/").slice(-1)[0],
    promptChars: String(params.prompt || "").length,
  });

  const avatar = await createAiAvatarProTask({
    prompt: params.prompt,
    imageUrl: params.imageUrl,
    audioUrl: params.audioUrl,
  });

  const externalTaskId = `avatar_${avatar.taskId}`;
  const durationMs = Date.now() - startedAt;
  const prevAttempts = Array.isArray(claim.generation.provider_attempts)
    ? claim.generation.provider_attempts
    : [];

  const nextMeta = {
    ...(claim.generation.metadata || {}),
    video_api_call_count: 1,
    video_provider_completed_at: new Date().toISOString(),
    i2v_provider: "kling_ai_avatar_pro",
    avatar_task_id: avatar.taskId,
    video_provider_duration_ms: durationMs,
    video_auto_retries: 0,
  };

  await supabase
    .from("generations")
    .update({
      provider: "kie",
      provider_task_id: appendProviderTaskId(
        claim.generation.provider_task_id,
        externalTaskId,
      ),
      metadata: nextMeta,
      provider_attempts: [
        ...prevAttempts,
        {
          provider: "kling_ai_avatar_pro",
          taskId: avatar.taskId,
          externalTaskId,
          durationMs,
          autoRetry: false,
        },
      ],
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.generationId);

  console.info("[generate-video-once] ai-avatar-pro job created", {
    generationId: params.generationId,
    videoRequestId: nextMeta.video_request_id || null,
    avatarTaskId: avatar.taskId,
    durationMs,
    apiCallCount: 1,
  });

  return {
    ok: true,
    deduplicated: false,
    externalTaskId,
    apiCallCount: 1,
    avatarTaskId: avatar.taskId,
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
  const alephJobsBefore = countAlephJobsInProviderTaskId(
    claim.generation.provider_task_id,
  );
  const meta =
    claim.generation.metadata && typeof claim.generation.metadata === "object"
      ? claim.generation.metadata
      : {};
  const userPrompt = String(
    claim.generation.prompt || meta.vehicle_prompt_raw || meta.vehicle_prompt || "",
  ).trim();
  const vehiclePov = isVehicleDrivingPrompt(userPrompt);
  const fallbackAspect = resolveAlephAspectForV2V({
    userAspect: meta.aleph_aspect_ratio || params.aspectRatio,
    vehiclePov,
  });
  const forceTranscode = params.forceTranscode !== false;
  const prepared = await resolveAlephSourceVideoUrl(
    params.videoUrl,
    claim.generation.user_id,
    { forceTranscode, fallbackAspect },
  );
  const alephAspectRatio = resolveAlephAspectForV2V({
    userAspect: fallbackAspect,
    detectedAspect: prepared.aspectRatio,
    vehiclePov,
  });
  const kieVideoUrl = await ensureKieAccessibleMediaUrl(prepared.url, "video");
  const kieRefImage = params.referenceImage
    ? await ensureKieAccessibleMediaUrl(params.referenceImage, "image")
    : undefined;
  const alephInput = {
    prompt: params.prompt,
    videoUrl: kieVideoUrl,
    aspectRatio: alephAspectRatio,
    referenceImage: kieRefImage,
  };
  const useLegacy =
    params.preferLegacyTransport === true || alephJobsBefore >= 2;
  const aleph = useLegacy
    ? await createAlephVideoTaskLegacy(alephInput)
    : await createAlephVideoTask(alephInput);

  const externalTaskId = `aleph_${aleph.taskId}`;
  const durationMs = Date.now() - startedAt;
  const prevAttempts = Array.isArray(claim.generation.provider_attempts)
    ? claim.generation.provider_attempts
    : [];

  const prevAutoRetries =
    Number(claim.generation.metadata?.video_auto_retries) || 0;
  const nextMeta = {
    ...(claim.generation.metadata || {}),
    video_api_call_count: 1,
    video_provider_completed_at: new Date().toISOString(),
    aleph_task_id: aleph.taskId,
    video_provider_duration_ms: durationMs,
    video_auto_retries: prevAutoRetries,
  };

  await supabase
    .from("generations")
    .update({
      provider: normalizeProviderForDb("runway_aleph"),
      provider_task_id: appendProviderTaskId(
        claim.generation.provider_task_id,
        externalTaskId,
      ),
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
    alephAspectRatio,
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
  const {
    resolveKlingCharacterOrientation,
    resolveKlingBackgroundSource,
  } = require("./video-user-errors");
  const kieVideoUrl = await ensureKieAccessibleMediaUrl(params.videoUrl, "video");

  const {
    shouldApplyMotionCleanComposite,
    prepareMotionCleanCompositeImage,
    prepareMotionCleanCompositeDirectFallback,
  } = require("./motion-control-composite");

  let motionImageUrl = params.imageUrl;
  let motionCleanCompositeApplied = false;
  let motionCompositeFallback = null;
  const uploadedSubject = params.motionReferenceSource === "uploaded";
  if (shouldApplyMotionCleanComposite(params)) {
    try {
      motionImageUrl = await prepareMotionCleanCompositeImage({
        userId: params.userId,
        subjectImageUrl: params.imageUrl,
        videoUrl: params.videoUrl,
      });
      motionCleanCompositeApplied = true;
    } catch (compositeErr) {
      motionCompositeFallback = String(compositeErr?.message || compositeErr).slice(
        0,
        200,
      );
      try {
        motionImageUrl = await prepareMotionCleanCompositeDirectFallback({
          userId: params.userId,
          subjectImageUrl: params.imageUrl,
          videoUrl: params.videoUrl,
        });
        motionCleanCompositeApplied = true;
        motionCompositeFallback = `direct_fallback:${motionCompositeFallback}`;
      } catch (fallbackErr) {
        console.warn("[generate-kling-once] motion composite fallback failed — raw photo", {
          generationId: params.generationId,
          primary: motionCompositeFallback,
          fallback: String(fallbackErr?.message || fallbackErr).slice(0, 200),
        });
        motionImageUrl = params.imageUrl;
      }
    }
  }

  const prevAutoRetries =
    Number(claim.generation.metadata?.video_auto_retries) || 0;
  const motionPollRelaunch =
    params.motionPollRelaunch === true || prevAutoRetries > 0;

  let promptForKling = params.prompt;
  if (uploadedSubject && params.imageUrl && !motionPollRelaunch) {
    const { buildMotionFullBodyPromptLock } = require("./motion-subject-prompt");
    const bodyLock = await buildMotionFullBodyPromptLock({
      imageUrl: params.imageUrl,
      userPrompt: params.prompt,
    });
    promptForKling = `${params.prompt}\n${bodyLock}`;
  }

  const klingPrompt = buildKlingMotionPrompt(promptForKling);
  const characterOrientation = resolveKlingCharacterOrientation(
    params.prompt,
    Boolean(params.imageUrl && uploadedSubject),
    params.characterOrientationOverride,
  );
  const backgroundSource = resolveKlingBackgroundSource({
    motionCleanCompositeApplied,
  });

  const kieImageUrl = await ensureKieAccessibleMediaUrl(motionImageUrl, "image");
  console.info("[generate-kling-once] motion control payload", {
    generationId: params.generationId,
    characterOrientation,
    backgroundSource,
    motionCleanCompositeApplied,
    motionPipeline: "kling30_sharp_overlay_v3_1",
    imageHost: kieImageUrl?.split("/").slice(-1)[0],
    videoHost: kieVideoUrl?.split("/").slice(-1)[0],
  });

  const { isRetryableKlingError } = require("./v2v-provider-errors");
  let kling;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      kling = await createKlingMotionTask({
        prompt: klingPrompt,
        inputUrls: [kieImageUrl],
        videoUrls: [kieVideoUrl],
        characterOrientation,
        backgroundSource,
        mode: params.mode || "720p",
      });
      break;
    } catch (taskErr) {
      if (attempt < 2 && isRetryableKlingError(taskErr)) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      throw taskErr;
    }
  }

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
    motion_composite_applied: motionCleanCompositeApplied,
    motion_clean_composite: motionCleanCompositeApplied,
    motion_pipeline: "kling30_sharp_overlay_v3_1",
    kling_character_orientation: characterOrientation,
    kling_background_source: backgroundSource,
    ...(motionCompositeFallback
      ? { motion_composite_fallback: motionCompositeFallback }
      : {}),
    ...(motionCleanCompositeApplied && motionImageUrl
      ? { motion_composite_image_url: motionImageUrl }
      : {}),
  };

  await supabase
    .from("generations")
    .update({
      provider: normalizeProviderForDb("kling_motion"),
      provider_task_id: appendProviderTaskId(
        claim.generation.provider_task_id,
        externalTaskId,
      ),
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

/**
 * Scène & luxe — ByteDance Seedance reference-to-video (remplace Omni).
 */
async function generateSeedanceTransformOnce(supabase, params) {
  const { createSeedanceTransformTask } = require("./kie-seedance-transform");
  const claim = await claimVideoProviderCall(supabase, params.generationId);
  if (!claim.allowed) {
    console.info("[generate-seedance-once] skipped duplicate provider call", {
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
  const seedance = await createSeedanceTransformTask({
    prompt: params.prompt,
    videoUrl: params.videoUrl,
    resolution: params.resolution,
    durationSec: params.durationSec,
    preserveSourceAudio: params.preserveSourceAudio,
  });

  const externalTaskId = `seedance_${seedance.taskId}`;
  const durationMs = Date.now() - startedAt;
  const prevAttempts = Array.isArray(claim.generation.provider_attempts)
    ? claim.generation.provider_attempts
    : [];

  const nextMeta = {
    ...(claim.generation.metadata || {}),
    video_api_call_count: 1,
    video_provider_completed_at: new Date().toISOString(),
    v2v_seedance_model: seedance.model,
    seedance_task_id: seedance.taskId,
    video_provider_duration_ms: durationMs,
  };

  await supabase
    .from("generations")
    .update({
      provider: "kie",
      provider_task_id: appendProviderTaskId(
        claim.generation.provider_task_id,
        externalTaskId,
      ),
      metadata: nextMeta,
      provider_attempts: [
        ...prevAttempts,
        {
          provider: "seedance_transform",
          model: seedance.model,
          taskId: seedance.taskId,
          externalTaskId,
          durationMs,
        },
      ],
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.generationId);

  console.info("[generate-seedance-once] job created", {
    generationId: params.generationId,
    seedanceTaskId: seedance.taskId,
    model: seedance.model,
    durationMs,
  });

  return {
    ok: true,
    deduplicated: false,
    externalTaskId,
    apiCallCount: 1,
    seedanceTaskId: seedance.taskId,
    durationMs,
  };
}

/**
 * Transformation Pro — Kling 3.0 Omni Reference To Video (single provider call).
 */
async function generateOmniRef2VOnce(supabase, params) {
  const claim = await claimVideoProviderCall(supabase, params.generationId);
  if (!claim.allowed) {
    console.info("[generate-omni-ref2v-once] skipped duplicate provider call", {
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
  const omni = await createKlingOmniRef2VTask({
    prompt: params.prompt,
    videoUrl: params.videoUrl,
    durationSec: params.durationSec,
    resolution: params.resolution,
  });

  const externalTaskId = `omni_${omni.taskId}`;
  const durationMs = Date.now() - startedAt;
  const prevAttempts = Array.isArray(claim.generation.provider_attempts)
    ? claim.generation.provider_attempts
    : [];

  const nextMeta = {
    ...(claim.generation.metadata || {}),
    video_api_call_count: 1,
    video_provider_completed_at: new Date().toISOString(),
    ultra_provider: "kling_3_omni_ref2v",
    omni_task_id: omni.taskId,
    video_provider_duration_ms: durationMs,
  };

  await supabase
    .from("generations")
    .update({
      provider: "kie",
      provider_task_id: appendProviderTaskId(
        claim.generation.provider_task_id,
        externalTaskId,
      ),
      metadata: nextMeta,
      provider_attempts: [
        ...prevAttempts,
        {
          provider: "kling_3_omni_ref2v",
          taskId: omni.taskId,
          externalTaskId,
          durationMs,
        },
      ],
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.generationId);

  console.info("[generate-omni-ref2v-once] job created", {
    generationId: params.generationId,
    omniTaskId: omni.taskId,
    durationMs,
  });

  return {
    ok: true,
    deduplicated: false,
    externalTaskId,
    apiCallCount: 1,
    omniTaskId: omni.taskId,
    durationMs,
  };
}

module.exports = {
  generateVideoOnce,
  generateVideoV2VOnce,
  generateKlingMotionOnce,
  generateOmniRef2VOnce,
  generateSeedanceTransformOnce,
  claimVideoProviderCall,
  readVideoApiCallCount,
  appendProviderTaskId,
};
