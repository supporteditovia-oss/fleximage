const { randomUUID } = require("crypto");
const { requireUser, readBody, sendError } = require("../user-auth");
const { isUserAdmin } = require("../admin-access");
const { uploadInputImagesToR2, uploadInputVideoToR2 } = require("../r2");
const { isRunwayConfigured } = require("../kie-runway");
const { generateVideoOnce, generateVideoV2VOnce } = require("../generate-video-once");
const {
  computeVideoCreditCost,
  buildRunwayPrompt,
  buildCarSwapPrompt,
  validateVoiceText,
} = require("../video-studio");
const {
  checkGenerationLimits,
  deductGenerationCredits,
  refundGenerationCreditsIfCharged,
  recordGeneration,
  translateLimitReason,
} = require("../generation");
const {
  findRecentInFlightGeneration,
  buildDedupGenerateResponse,
} = require("../generation-dedup");
const { resolveRequestLocale, copy } = require("../locale-copy");
const {
  isDisallowedAdultPrompt,
  contentPolicyResponse,
} = require("../content-policy");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeVideoRequestId(raw) {
  if (typeof raw !== "string") return randomUUID();
  const id = raw.trim();
  return UUID_RE.test(id) ? id : randomUUID();
}

async function findByVideoRequestId(supabase, videoRequestId) {
  const { data: rows, error } = await supabase
    .from("generations")
    .select("*")
    .contains("metadata", { video_request_id: videoRequestId })
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return rows && rows[0] ? rows[0] : null;
}

async function resolveSourceImageUrl(supabase, userId, body) {
  if (typeof body.image_url === "string" && body.image_url.startsWith("http")) {
    return body.image_url;
  }

  if (typeof body.source_larp_id === "string" && body.source_larp_id.trim()) {
    const { data: sourceGen, error } = await supabase
      .from("generations")
      .select("output_assets, watermarked_assets, user_id")
      .eq("id", body.source_larp_id.trim())
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!sourceGen) {
      throw Object.assign(new Error("Image source introuvable"), {
        status: 404,
        code: "SOURCE_NOT_FOUND",
      });
    }
    const assets = Array.isArray(sourceGen.output_assets)
      ? sourceGen.output_assets
      : [];
    const wm = Array.isArray(sourceGen.watermarked_assets)
      ? sourceGen.watermarked_assets
      : [];
    const url = assets[0] || wm[0];
    if (!url) {
      throw Object.assign(new Error("Cette création n'a pas d'image utilisable"), {
        status: 422,
        code: "SOURCE_IMAGE_MISSING",
      });
    }
    return url;
  }

  const images = Array.isArray(body.images) ? body.images : [];
  if (images.length === 0) {
    throw Object.assign(new Error("Une image source est requise"), {
      status: 422,
      code: "REFERENCE_IMAGE_REQUIRED",
    });
  }
  const uploaded = await uploadInputImagesToR2(userId, images);
  if (!uploaded[0]) {
    throw Object.assign(new Error("Échec upload image"), { status: 502 });
  }
  return uploaded[0];
}

const VEHICLE_PRESET_PROMPTS = {
  lamborghini_urus:
    "Lamborghini Urus noir mat, proportions réalistes, jantes d'origine, reflets crédibles.",
  porsche_gt3_rs:
    "Porsche 911 GT3 RS, aileron arrière, couleur sport, détails carrosserie fidèles.",
  ferrari:
    "Ferrari rouge Rosso Corsa, supercar italienne, lignes agressives, rendu photoréaliste.",
  g_wagon:
    "Mercedes-Benz G-Class G-Wagon noir, carrosserie cubique iconique, finitions luxe.",
};

async function resolveSourceVideoUrl(userId, body) {
  if (typeof body.video_url === "string" && body.video_url.startsWith("http")) {
    return body.video_url;
  }
  const videos = Array.isArray(body.videos) ? body.videos : [];
  if (videos.length === 0) {
    throw Object.assign(new Error("Une vidéo source est requise"), {
      status: 422,
      code: "REFERENCE_VIDEO_REQUIRED",
    });
  }
  const uploaded = await uploadInputVideoToR2(userId, videos[0]);
  if (!uploaded) {
    throw Object.assign(new Error("Échec upload vidéo (MP4 requis)"), {
      status: 422,
      code: "VIDEO_UPLOAD_FAILED",
    });
  }
  return uploaded;
}

function resolveVehicleDescription(body) {
  const custom =
    typeof body.vehicle_prompt === "string" ? body.vehicle_prompt.trim() : "";
  if (custom.length >= 5) return custom;
  const presetId =
    typeof body.vehicle_preset === "string" ? body.vehicle_preset.trim() : "";
  if (presetId && VEHICLE_PRESET_PROMPTS[presetId]) {
    return VEHICLE_PRESET_PROMPTS[presetId];
  }
  return "";
}

function buildV2VProviderPrompt(body, vehicleDescription) {
  const custom =
    typeof body.vehicle_prompt === "string" ? body.vehicle_prompt.trim() : "";
  if (custom.length >= 10) {
    const hasSceneLock =
      /d[ée]cor|cam[ée]ra|reflet|background|ground|reflection|unchanged|identique/i.test(
        custom,
      );
    return hasSceneLock
      ? custom
      : `${custom} Garde le décor, le sol, les reflets et les mouvements de caméra identiques.`;
  }
  return buildCarSwapPrompt(vehicleDescription);
}

async function validateVoiceOwnership(supabase, userId, body, uiLocale) {
  if (!body.voice_enabled) return null;

  if (body.voice_mode === "none") return null;

  if (!body.voice_consent) {
    throw Object.assign(
      new Error(
        copy(
          uiLocale,
          "Tu dois confirmer avoir le droit d'utiliser cette voix.",
          "You must confirm you have the right to use this voice.",
        ),
      ),
      { status: 422, code: "VOICE_CONSENT_REQUIRED" },
    );
  }

  const voiceTextCheck = validateVoiceText(
    body.voice_text,
    body.duration_sec === 10 ? 10 : 5,
  );
  if (!voiceTextCheck.ok) {
    throw Object.assign(new Error(voiceTextCheck.reason), {
      status: 422,
      code: "VOICE_TEXT_TOO_LONG",
    });
  }

  if (body.voice_mode === "cloned" && body.voice_clone_id) {
    const { data: clone, error } = await supabase
      .from("voice_clones")
      .select("id, user_id, name, fish_reference_id")
      .eq("id", body.voice_clone_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!clone) {
      throw Object.assign(new Error("Voix clonée introuvable"), {
        status: 403,
        code: "VOICE_NOT_AUTHORIZED",
      });
    }
    return clone;
  }

  return { id: null, name: "Voix IA", fish_reference_id: null };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const { supabase, userId } = await requireUser(req);
    const body = readBody(req);
    const uiLocale = resolveRequestLocale(req, body);

    const workflow =
      body.workflow === "video_to_video" ? "video_to_video" : "image_to_video";

    const motionPrompt =
      typeof body.motion_prompt === "string" ? body.motion_prompt.trim() : "";
    const vehicleDescription = resolveVehicleDescription(body);

    if (workflow === "image_to_video") {
      if (!motionPrompt || motionPrompt.length < 10 || motionPrompt.length > 2000) {
        res.status(400).json({
          message: copy(
            uiLocale,
            "Décris le mouvement (10–2000 caractères).",
            "Describe the motion (10–2000 characters).",
          ),
        });
        return;
      }
      if (isDisallowedAdultPrompt(motionPrompt)) {
        res.status(422).json(contentPolicyResponse(uiLocale));
        return;
      }
    } else {
      if (!vehicleDescription || vehicleDescription.length > 500) {
        res.status(400).json({
          message: copy(
            uiLocale,
            "Choisis une supercar ou décris le véhicule de remplacement.",
            "Pick a supercar or describe the replacement vehicle.",
          ),
        });
        return;
      }
      if (isDisallowedAdultPrompt(vehicleDescription)) {
        res.status(422).json(contentPolicyResponse(uiLocale));
        return;
      }
    }

    const admin = await isUserAdmin(supabase, userId);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_subscriber, credits")
      .eq("id", userId)
      .single();
    const isAdmin = admin || profile?.role === "admin";

    // Preview admin uniquement — les clients n'ont pas accès tant que la feature n'est pas ouverte.
    if (!isAdmin) {
      res.status(403).json({
        code: "ADMIN_PREVIEW_ONLY",
        message: copy(
          uiLocale,
          "Le studio vidéo IA est réservé aux administrateurs (preview).",
          "The AI video studio is admin-only preview.",
        ),
      });
      return;
    }

    const durationSec = body.duration_sec === 10 ? 10 : 5;
    const aspectRatio =
      body.aspect_ratio === "16:9" || body.aspect_ratio === "1:1"
        ? body.aspect_ratio
        : "9:16";
    const quality = body.quality === "high" ? "high" : "standard";
    const voiceEnabled = Boolean(body.voice_enabled);
    const subtitlesEnabled = Boolean(body.subtitles_enabled);

    const creditCost = computeVideoCreditCost({
      workflow,
      durationSec,
      quality,
      voiceEnabled,
      isAdmin,
    });

    const limitResult = await checkGenerationLimits(supabase, userId);
    if (!limitResult.allowed && !isAdmin) {
      res.status(403).json({
        message: translateLimitReason(limitResult.reason, uiLocale),
      });
      return;
    }
    if (!isAdmin && profile.credits < creditCost) {
      res.status(403).json({
        message: copy(
          uiLocale,
          "Plus assez de jetons pour cette vidéo.",
          "Not enough credits for this video.",
        ),
      });
      return;
    }

    const inFlight = await findRecentInFlightGeneration(supabase, userId);
    if (inFlight) {
      res.status(200).json(buildDedupGenerateResponse(inFlight));
      return;
    }

    const videoRequestId = normalizeVideoRequestId(body.video_request_id);
    const existing = await findByVideoRequestId(supabase, videoRequestId);
    if (existing) {
      if (existing.status === "failed") {
        res.status(409).json({
          code: "VIDEO_ALREADY_FAILED",
          message: copy(
            uiLocale,
            "Cette vidéo a déjà échoué. Lance une nouvelle génération.",
            "This video already failed. Start a new generation.",
          ),
          videoRequestId,
        });
        return;
      }
      res.status(200).json({
        ...buildDedupGenerateResponse(existing),
        videoRequestId,
      });
      return;
    }

    if (!isRunwayConfigured()) {
      res.status(503).json({
        message: "Fournisseur vidéo non configuré (KIE_AI_API_KEY requis).",
      });
      return;
    }

    let voiceClone = null;
    if (workflow === "image_to_video" && voiceEnabled) {
      try {
        voiceClone = await validateVoiceOwnership(supabase, userId, body, uiLocale);
      } catch (voiceErr) {
        res.status(voiceErr.status || 422).json({
          code: voiceErr.code || "VOICE_VALIDATION_FAILED",
          message: voiceErr.message,
        });
        return;
      }
    }

    let sourceAssetUrl;
    let providerPrompt;
    try {
      if (workflow === "video_to_video") {
        sourceAssetUrl = await resolveSourceVideoUrl(userId, body);
        providerPrompt = buildV2VProviderPrompt(body, vehicleDescription);
      } else {
        sourceAssetUrl = await resolveSourceImageUrl(supabase, userId, body);
        providerPrompt = buildRunwayPrompt({
          motionPrompt,
          cameraMovement: body.camera_movement,
          motionIntensity: body.motion_intensity,
          style: body.style,
          voiceEnabled,
          voiceText: body.voice_text,
        });
      }
    } catch (srcErr) {
      res.status(srcErr.status || 422).json({
        code: srcErr.code || "SOURCE_REQUIRED",
        message: srcErr.message,
      });
      return;
    }

    const pendingTaskId = `pending_${randomUUID()}`;
    const studioMetadata = {
      video_request_id: videoRequestId,
      video_api_call_count: 0,
      video_auto_retries: 0,
      studio_stage: "VALIDATING",
      workflow,
      source: body.source || "video_studio",
      click_count: Number(body.click_count) > 0 ? Number(body.click_count) : 1,
      frontend_timestamp: body.frontend_timestamp || null,
      duration_sec: workflow === "video_to_video" ? null : durationSec,
      quality: workflow === "video_to_video" ? null : quality,
      camera_movement: body.camera_movement || "fixed",
      motion_intensity: body.motion_intensity || "natural",
      style: body.style || "realistic",
      voice_enabled: workflow === "image_to_video" ? voiceEnabled : false,
      voice_mode: body.voice_mode || "none",
      voice_clone_id: voiceClone?.id || null,
      voice_text:
        workflow === "image_to_video" && voiceEnabled
          ? String(body.voice_text || "").trim()
          : null,
      voice_consent: Boolean(body.voice_consent),
      lip_sync_enabled: voiceEnabled,
      subtitles_enabled:
        workflow === "image_to_video" ? subtitlesEnabled : false,
      subtitle_style: body.subtitle_style || "minimal_white",
      subtitle_position: body.subtitle_position || "bottom",
      overlay_text: body.overlay_text || null,
      vehicle_preset: body.vehicle_preset || null,
      vehicle_prompt: vehicleDescription,
      ai_label: "Vidéo générée ou modifiée par IA.",
      estimated_seconds:
        workflow === "video_to_video" ? 240 : durationSec === 10 ? 180 : 120,
    };

    const userPrompt =
      workflow === "video_to_video" ? vehicleDescription : motionPrompt;

    const { data: larp, error: insertErr } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        template_id: null,
        generation_type: "video",
        prompt: userPrompt,
        final_prompt: providerPrompt,
        provider: workflow === "video_to_video" ? "runway_aleph" : "runway",
        provider_task_id: pendingTaskId,
        status: "processing",
        aspect_ratio: aspectRatio,
        input_assets: [sourceAssetUrl],
        credit_cost: creditCost,
        metadata: studioMetadata,
        provider_attempts: [],
        output_assets: [],
        watermarked_assets: [],
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    const deductErr = await deductGenerationCredits(supabase, {
      userId,
      creditCost,
      generationId: larp.id,
      metadata: {
        source: "video_studio",
        video_request_id: videoRequestId,
        phase: "pre_provider",
      },
    });
    if (deductErr) {
      await supabase
        .from("generations")
        .update({
          status: "failed",
          fail_message: "Échec débit jetons",
          updated_at: new Date().toISOString(),
        })
        .eq("id", larp.id);
      res.status(500).json({ message: "Échec du débit des jetons" });
      return;
    }

    await recordGeneration(supabase, userId);

    let providerResult;
    try {
      if (workflow === "video_to_video") {
        providerResult = await generateVideoV2VOnce(supabase, {
          generationId: larp.id,
          prompt: providerPrompt,
          videoUrl: sourceAssetUrl,
          aspectRatio,
        });
      } else {
        providerResult = await generateVideoOnce(supabase, {
          generationId: larp.id,
          prompt: providerPrompt,
          imageUrl: sourceAssetUrl,
          aspectRatio,
          durationSec,
          quality,
        });
      }
    } catch (providerErr) {
      console.error("[generate-video] provider failed", providerErr);
      await supabase
        .from("generations")
        .update({
          status: "failed",
          fail_message: String(providerErr.message || "Échec Runway").slice(0, 240),
          metadata: {
            ...studioMetadata,
            studio_stage: "FAILED",
          },
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", larp.id);
      await refundGenerationCreditsIfCharged(supabase, {
        userId,
        generationId: larp.id,
        source: "video_provider_failed",
        failMessage: providerErr.message,
      }).catch(() => {});
      res.status(502).json({
        message: copy(
          uiLocale,
          "Échec création vidéo. Jetons remboursés.",
          "Video creation failed. Credits refunded.",
        ),
        videoRequestId,
      });
      return;
    }

    await supabase
      .from("generations")
      .update({
        metadata: {
          ...studioMetadata,
          studio_stage: "GENERATING_VIDEO",
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", larp.id);

    res.status(201).json({
      id: larp.id,
      taskId: providerResult.externalTaskId,
      status: "waiting",
      estimatedSeconds: studioMetadata.estimated_seconds,
      createdAt: larp.created_at,
      videoRequestId,
      deduplicated: Boolean(providerResult.deduplicated),
      creditCost,
      generationType: "video",
    });
  } catch (error) {
    console.error("generate-video error", error);
    sendError(res, error);
  }
};

module.exports.config = {
  api: {
    bodyParser: { sizeLimit: "25mb" },
  },
  maxDuration: 120,
};
