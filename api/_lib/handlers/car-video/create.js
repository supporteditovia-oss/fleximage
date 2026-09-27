const { randomUUID } = require("crypto");
const { requireUser, readBody, sendError } = require("../../user-auth");
const { buildCarVideoPrompt } = require("../../car-video-transform/prompts");
const { resolveVehicleReferenceImageUrl } = require("../../car-video-transform/references");
const {
  validateDurationSeconds,
  assertOwnedInputVideoUrl,
  sanitizeGenerationBody,
} = require("../../car-video-transform/validate");
const {
  estimateCarVideoCredits,
  CAR_VIDEO_MODEL,
  CAR_VIDEO_RESOLUTION,
  CAR_VIDEO_MAX_DURATION_SEC,
} = require("../../car-video-transform/constants");
const {
  assertCarVideoGenerationAccess,
  bumpCarVideoRateLimit,
} = require("../../car-video-transform/access");
const { submitWanEditVideoTask } = require("../../car-video-transform/poyo-client");
const {
  deductCarVideoCredits,
  refundCarVideoCreditsIfCharged,
} = require("../../car-video-transform/credits");

function siteOriginFromRequest(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (host) return `${proto}://${host}`;
  return process.env.PUBLIC_SITE_URL || "";
}

function publicStatusLabel(status) {
  const map = {
    uploaded: "Vidéo ajoutée",
    validating: "Vérification de la vidéo…",
    queued: "Votre vidéo est dans la file d'attente",
    processing: "Transformation IA en cours… Cela peut prendre quelques minutes.",
    completed: "Votre vidéo est prête",
    failed:
      "La génération a échoué. Aucun nouveau crédit n'a été consommé automatiquement.",
  };
  return map[status] || status;
}

module.exports = async function carVideoCreateHandler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  let generationId = null;
  let userId = null;
  let supabase = null;

  try {
    ({ supabase, userId } = await requireUser(req));
    await bumpCarVideoRateLimit(supabase, userId, req);

    const body = readBody(req);
    const idempotencyKey =
      String(req.headers["idempotency-key"] || body.idempotencyKey || "").trim() ||
      null;

    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from("car_video_generations")
        .select("id, status, credits_estimated, input_video_duration_seconds")
        .eq("user_id", userId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existing) {
        res.status(200).json({
          generationId: existing.id,
          status: existing.status,
          statusLabel: publicStatusLabel(existing.status),
          durationSeconds: Number(existing.input_video_duration_seconds),
          creditsEstimated: existing.credits_estimated,
        });
        return;
      }
    }

    const videoUrl = assertOwnedInputVideoUrl(body.inputVideoUrl || body.videoUrl, userId);
    const durationCheck = validateDurationSeconds(body.durationSeconds || body.duration_sec);
    if (!durationCheck.ok) {
      throw Object.assign(new Error(durationCheck.message), {
        status: 422,
        code: durationCheck.code,
      });
    }

    const durationSec = Math.min(
      CAR_VIDEO_MAX_DURATION_SEC,
      Math.ceil(durationCheck.durationSec),
    );

    const choices = sanitizeGenerationBody(body);
    const prompt = buildCarVideoPrompt(choices);
    const creditsEstimated = estimateCarVideoCredits(durationSec);

    const { isAdmin } = await assertCarVideoGenerationAccess(supabase, userId, {
      creditCost: creditsEstimated,
    });

    const referenceImageUrl =
      choices.planType === "exterior"
        ? resolveVehicleReferenceImageUrl(
            choices.selectedVehicle,
            siteOriginFromRequest(req),
          )
        : null;

    generationId = randomUUID();

    const { data: row, error: insertErr } = await supabase
      .from("car_video_generations")
      .insert({
        id: generationId,
        user_id: userId,
        input_video_url: videoUrl,
        input_video_duration_seconds: durationCheck.durationSec,
        reference_image_url: referenceImageUrl,
        plan_type: choices.planType,
        selected_vehicle: choices.selectedVehicle,
        selected_interior_style: choices.selectedInteriorStyle,
        prompt,
        model: CAR_VIDEO_MODEL,
        resolution: CAR_VIDEO_RESOLUTION,
        status: "validating",
        credits_estimated: creditsEstimated,
        idempotency_key: idempotencyKey,
        payment_verified: true,
        metadata: { aspect_ratio: "16:9" },
      })
      .select("*")
      .single();

    if (insertErr) throw insertErr;

    const creditCost = isAdmin ? 0 : creditsEstimated;
    const deductErr = await deductCarVideoCredits(supabase, {
      userId,
      generationId: row.id,
      creditCost,
      metadata: { source: "car_video_transform" },
    });
    if (deductErr) {
      await supabase
        .from("car_video_generations")
        .update({
          status: "failed",
          error_message: "Échec débit jetons",
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      throw Object.assign(new Error("Échec du débit des jetons"), { status: 500 });
    }

    if (creditCost > 0) {
      await supabase
        .from("car_video_generations")
        .update({
          credits_charged: creditCost,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    }

    const { data: claimed } = await supabase
      .from("car_video_generations")
      .update({
        status: "queued",
        poyo_submit_started: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("poyo_submit_started", false)
      .select("*")
      .maybeSingle();

    if (!claimed) {
      res.status(200).json({
        generationId: row.id,
        status: row.status,
        statusLabel: publicStatusLabel(row.status),
        durationSeconds: durationSec,
        creditsEstimated,
      });
      return;
    }

    let poyoTask;
    try {
      poyoTask = await submitWanEditVideoTask({
        prompt,
        videoUrl,
        referenceImageUrl: referenceImageUrl || undefined,
        durationSec,
        aspectRatio: "16:9",
      });
    } catch (poyoErr) {
      await refundCarVideoCreditsIfCharged(supabase, {
        userId,
        generationId: row.id,
        reason: "poyo_submit_failed",
      });
      await supabase
        .from("car_video_generations")
        .update({
          status: "failed",
          error_code: poyoErr.code || "POYO_SUBMIT_FAILED",
          error_message: poyoErr.message,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      throw poyoErr;
    }

    await supabase
      .from("car_video_generations")
      .update({
        poyo_task_id: poyoTask.taskId,
        status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    res.status(201).json({
      generationId: row.id,
      status: "processing",
      statusLabel: publicStatusLabel("processing"),
      durationSeconds: durationSec,
      creditsEstimated,
      resolution: CAR_VIDEO_RESOLUTION,
    });
  } catch (error) {
    console.error("car-video create error", error?.code || error?.message);
    sendError(res, error);
  }
};
