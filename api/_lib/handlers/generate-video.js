const { randomUUID } = require("crypto");
const { requireUser, readBody, sendError } = require("../user-auth");
const { isUserAdmin } = require("../admin-access");
const {
  uploadInputImagesToR2,
  uploadInputVideoToR2,
  isOwnedR2PublicUrl,
} = require("../r2");
const { isRunwayConfigured } = require("../kie-runway");
const {
  generateVideoOnce,
  generateVideoV2VOnce,
  generateKlingMotionOnce,
} = require("../generate-video-once");
const {
  VIDEO_V2V_MAX_DURATION_SEC,
  VIDEO_V2V_MAX_SIZE_BYTES,
  validateSourceVideoDuration,
} = require("../video-limits");
const {
  computeVideoCreditCost,
  buildRunwayPrompt,
  buildV2VProviderPrompt,
  validateVoiceText,
} = require("../video-studio");
const {
  resolveV2vVoiceMode,
  isV2vVoiceTransformMode,
} = require("../v2v-voice-pool");
const { validateV2vVoicePromptPolicy } = require("../v2v-prompt-guard");
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
    if (!isOwnedR2PublicUrl(body.video_url)) {
      throw Object.assign(new Error("URL vidéo non autorisée"), {
        status: 422,
        code: "VIDEO_URL_FORBIDDEN",
      });
    }
    return body.video_url;
  }
  const videos = Array.isArray(body.videos) ? body.videos : [];
  if (videos.length === 0) {
    throw Object.assign(new Error("Une vidéo source est requise"), {
      status: 422,
      code: "REFERENCE_VIDEO_REQUIRED",
    });
  }
  const raw = String(videos[0] || "");
  const sizeMatch = raw.match(/^data:video\/[\w+.-]+;base64,([\s\S]+)$/);
  if (sizeMatch) {
    const byteLen = Buffer.byteLength(sizeMatch[1], "base64");
    if (byteLen > VIDEO_V2V_MAX_SIZE_BYTES) {
      throw Object.assign(
        new Error(
          `Vidéo trop lourde (max ${Math.round(VIDEO_V2V_MAX_SIZE_BYTES / (1024 * 1024))} Mo).`,
        ),
        { status: 422, code: "VIDEO_TOO_LARGE" },
      );
    }
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

async function resolveOptionalReferenceImageUrl(supabase, userId, body) {
  const refImages = Array.isArray(body.reference_images)
    ? body.reference_images
    : [];
  if (refImages.length > 0) {
    const uploaded = await uploadInputImagesToR2(userId, refImages);
    return uploaded[0] || null;
  }
  if (
    typeof body.reference_image_url === "string" &&
    body.reference_image_url.startsWith("http")
  ) {
    return body.reference_image_url;
  }
  return null;
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

  const voiceDurationSec =
    body.source_video_duration_sec != null
      ? Math.min(8, Math.max(3, Number(body.source_video_duration_sec) || 5))
      : body.duration_sec === 10
        ? 10
        : 5;
  const voiceMode = body.voice_mode || "catalog";
  const voiceTextRaw = String(body.voice_text || "").trim();

  if (voiceMode === "auto_adaptive") {
    if (voiceTextRaw.length > 0) {
      const voiceTextCheck = validateVoiceText(voiceTextRaw, voiceDurationSec);
      if (!voiceTextCheck.ok) {
        throw Object.assign(new Error(voiceTextCheck.reason), {
          status: 422,
          code: "VOICE_TEXT_TOO_LONG",
        });
      }
    }
    return { id: null, name: "Voix adaptée", fish_reference_id: null };
  }

  const voiceTextCheck = validateVoiceText(body.voice_text, voiceDurationSec);
  if (!voiceTextCheck.ok) {
    throw Object.assign(new Error(voiceTextCheck.reason), {
      status: 422,
      code: "VOICE_TEXT_TOO_LONG",
    });
  }

  if (voiceMode === "cloned" && body.voice_clone_id) {
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
            "Décris la transformation souhaitée (véhicule, personnage, objet…).",
            "Describe the desired transformation (vehicle, person, object…).",
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
    const voiceEnabled =
      workflow === "image_to_video" && Boolean(body.voice_enabled);
    const preserveSourceAudioLegacy =
      workflow === "video_to_video" && Boolean(body.preserve_source_audio);
    const v2vVoiceMode =
      workflow === "video_to_video"
        ? resolveV2vVoiceMode(body.v2v_voice_mode, preserveSourceAudioLegacy)
        : "none";
    const preserveSourceAudio =
      workflow === "video_to_video" && v2vVoiceMode === "preserve";
    const v2vVoiceTransform =
      workflow === "video_to_video" && isV2vVoiceTransformMode(v2vVoiceMode);
    const i2vVoicePending =
      workflow === "image_to_video" && voiceEnabled;
    const subtitlesEnabled = Boolean(body.subtitles_enabled);

    let visualSwapDescription = vehicleDescription;
    let v2vPromptVoiceIntentDetected = false;
    if (workflow === "video_to_video") {
      const voicePolicy = validateV2vVoicePromptPolicy({
        swapPrompt: vehicleDescription,
        v2vVoiceMode,
        uiLocale,
      });
      if (!voicePolicy.ok) {
        res.status(422).json({
          code: voicePolicy.code,
          message: voicePolicy.message,
        });
        return;
      }
      visualSwapDescription = voicePolicy.visualPrompt;
      v2vPromptVoiceIntentDetected = Boolean(voicePolicy.voiceIntentDetected);
    }

    let sourceVideoDurationSec = null;
    if (workflow === "video_to_video") {
      const durationCheck = validateSourceVideoDuration(
        body.source_video_duration_sec,
        uiLocale,
      );
      if (!durationCheck.ok) {
        res.status(422).json({
          code: durationCheck.code,
          message: durationCheck.message,
          maxDurationSec: VIDEO_V2V_MAX_DURATION_SEC,
        });
        return;
      }
      sourceVideoDurationSec = durationCheck.durationSec;
    }

    const creditCost = computeVideoCreditCost({
      workflow,
      durationSec,
      quality,
      voiceEnabled,
      preserveSourceAudio,
      v2vVoiceMode,
      isAdmin,
      sourceVideoDurationSec,
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
    if (voiceEnabled) {
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
    let referenceImageUrl = null;
    let v2vProvider = null;
    let providerPrompt;
    try {
      if (workflow === "video_to_video") {
        sourceAssetUrl = await resolveSourceVideoUrl(userId, body);
        referenceImageUrl = await resolveOptionalReferenceImageUrl(
          supabase,
          userId,
          body,
        );
        v2vProvider = referenceImageUrl ? "kling_motion" : "runway_aleph";
        providerPrompt = buildV2VProviderPrompt(
          { ...body, vehicle_prompt: visualSwapDescription },
          visualSwapDescription,
        );
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
      voice_enabled: voiceEnabled,
      voice_mode: voiceEnabled ? body.voice_mode || "catalog" : "none",
      voice_clone_id: voiceClone?.id || null,
      voice_text: voiceEnabled
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
      vehicle_prompt_visual: visualSwapDescription,
      v2v_prompt_voice_intent_detected: v2vPromptVoiceIntentDetected,
      source_video_duration_sec: sourceVideoDurationSec,
      source_video_url:
        workflow === "video_to_video" ? sourceAssetUrl : null,
      preserve_source_audio: preserveSourceAudio,
      v2v_voice_mode: v2vVoiceMode,
      voice_transform_pending: v2vVoiceTransform || i2vVoicePending,
      source_image_url:
        workflow === "image_to_video" ? sourceAssetUrl : null,
      v2v_provider: v2vProvider,
      v2v_max_duration_sec: VIDEO_V2V_MAX_DURATION_SEC,
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
        provider:
          workflow === "video_to_video"
            ? v2vProvider || "runway_aleph"
            : "runway",
        provider_task_id: pendingTaskId,
        status: "processing",
        aspect_ratio: aspectRatio,
        input_assets:
          workflow === "video_to_video" && referenceImageUrl
            ? [referenceImageUrl, sourceAssetUrl]
            : [sourceAssetUrl],
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
        if (referenceImageUrl) {
          providerResult = await generateKlingMotionOnce(supabase, {
            generationId: larp.id,
            prompt: providerPrompt,
            imageUrl: referenceImageUrl,
            videoUrl: sourceAssetUrl,
            mode: "720p",
          });
        } else {
          providerResult = await generateVideoV2VOnce(supabase, {
            generationId: larp.id,
            prompt: providerPrompt,
            videoUrl: sourceAssetUrl,
            aspectRatio,
          });
        }
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
          fail_message: String(providerErr.message || "Échec génération vidéo").slice(
            0,
            240,
          ),
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
