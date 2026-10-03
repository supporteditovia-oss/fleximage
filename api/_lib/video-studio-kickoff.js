const {
  generateVideoOnce,
  generateVideoV2VOnce,
  generateKlingMotionOnce,
  generateOmniRef2VOnce,
  readVideoApiCallCount,
} = require("./generate-video-once");
const {
  normalizeVideoUltraResolution,
} = require("../../shared/video-ultra-pricing.cjs");
const { prepareI2VAvatarAudioUrl } = require("./i2v-avatar-audio");
const { ensureKieAccessibleMediaUrl } = require("./kie-file-upload");
const {
  buildAlephSubmitPrompt,
  buildOmniTransformPrompt,
  buildV2VProviderPrompt,
  isAlephTransformEnabled,
  isV2VOmniTransformRolloutEnabled,
  shouldUseOmniTransformForV2V,
  isVehicleDrivingPrompt,
  v2vEngineFamilyForProvider,
} = require("./video-studio");
const {
  isRetryableAlephError,
  resetVideoProviderClaim,
} = require("./v2v-provider-errors");
const {
  getReferenceImageUrlFromLarp,
  getSourceVideoUrlFromLarp,
} = require("./mux-source-audio");
const { extractReferenceFrameFromVideoUrl } = require("./extract-video-frame");
const {
  resolveKlingMotionSourceVideoUrl,
  resolveOmniSourceVideoUrl,
} = require("./prepare-kling-source-video");
const { mapVideoProviderMessage } = require("./video-user-errors");
const { refundGenerationCreditsIfCharged } = require("./generation");

function readKickoffLock(meta) {
  const started = meta?.video_kickoff_started_at;
  if (!started) return false;
  const age = Date.now() - new Date(started).getTime();
  return age >= 0 && age < 120_000;
}

async function markVideoKickoffFailed(
  supabase,
  userId,
  larp,
  message,
  options = {},
) {
  const failMessage = String(message || "Échec envoi studio").slice(0, 240);
  const meta =
    larp.metadata && typeof larp.metadata === "object" ? larp.metadata : {};
  await supabase
    .from("generations")
    .update({
      status: "failed",
      fail_message: failMessage,
      metadata: {
        ...meta,
        studio_stage: "FAILED",
        video_kickoff_failed: true,
      },
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq("id", larp.id);
  const skipRefund =
    options.skipRefund === true || meta.defer_credit_charge === true;
  if (!skipRefund) {
    await refundGenerationCreditsIfCharged(supabase, {
      userId,
      generationId: larp.id,
      source: "video_kickoff_failed",
      failMessage,
    }).catch((err) => console.error("refund failed", err));
  }
}

/**
 * Démarre le job Kie (Aleph/Kling/I2V) après réponse HTTP rapide au client.
 */
async function kickoffVideoStudioProvider(supabase, larp, userId) {
  const meta =
    larp.metadata && typeof larp.metadata === "object" ? larp.metadata : {};
  const workflow = meta.workflow || "image_to_video";

  if (readVideoApiCallCount(meta) >= 1) {
    return { larp, started: false, failed: false };
  }
  if (readKickoffLock(meta)) {
    return { larp, started: false, failed: false, inProgress: true };
  }

  await supabase
    .from("generations")
    .update({
      metadata: {
        ...meta,
        video_kickoff_started_at: new Date().toISOString(),
        studio_stage: "UPLOADING",
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", larp.id);

  let sourceAssetUrl =
    typeof meta.source_video_url === "string" && meta.source_video_url
      ? meta.source_video_url
      : workflow === "video_to_video"
        ? getSourceVideoUrlFromLarp(larp)
        : Array.isArray(larp.input_assets)
          ? larp.input_assets[0]
          : null;

  if (!sourceAssetUrl) {
    await markVideoKickoffFailed(
      supabase,
      userId,
      larp,
      "Vidéo source introuvable — réessaie l'import.",
    );
    return { larp, started: false, failed: true };
  }

  const aspectRatio =
    meta.aleph_aspect_ratio || larp.aspect_ratio || "16:9";
  const preserveSourceAudio = meta.preserve_source_audio === true;
  let referenceImageUrl = getReferenceImageUrlFromLarp(larp);
  let finalV2vProvider = meta.v2v_provider || "runway_aleph";

  const userPrompt = String(larp.prompt || meta.vehicle_prompt || "").trim();
  const providerPrompt =
    String(larp.final_prompt || "").trim() ||
    buildV2VProviderPrompt(userPrompt, { preserveSourceAudio });
  const alephSubmitPrompt =
    (typeof meta.aleph_submit_prompt === "string" && meta.aleph_submit_prompt) ||
    buildAlephSubmitPrompt(userPrompt, { preserveSourceAudio });

  try {
    if (workflow === "video_to_video") {
      const v2vResolution = normalizeVideoUltraResolution(
        meta.v2v_resolution || "720p",
      );

      const omniRollout = isV2VOmniTransformRolloutEnabled(meta);
      const runOmniStudio = async (videoUrl) =>
        generateOmniRef2VOnce(supabase, {
          generationId: larp.id,
          prompt: omniRollout
            ? buildOmniTransformPrompt(userPrompt, { preserveSourceAudio })
            : userPrompt || providerPrompt,
          videoUrl,
          resolution: v2vResolution,
        });

      const motionMode =
        v2vResolution === "1080p" || v2vResolution === "4k" ? "1080p" : "720p";

      const runKling = async (videoUrl, imageUrl) =>
        generateKlingMotionOnce(supabase, {
          generationId: larp.id,
          prompt: providerPrompt,
          imageUrl,
          videoUrl,
          mode: motionMode,
        });
      const runAleph = async (videoUrl, refImage) => {
        const omitRef =
          isVehicleDrivingPrompt(userPrompt) ||
          isVehicleDrivingPrompt(alephSubmitPrompt);
        return generateVideoV2VOnce(supabase, {
          generationId: larp.id,
          prompt: alephSubmitPrompt || providerPrompt,
          videoUrl,
          aspectRatio,
          referenceImage: omitRef ? undefined : refImage || undefined,
        });
      };

      const engineFamily =
        meta.v2v_engine_family ||
        v2vEngineFamilyForProvider(finalV2vProvider);

      try {
        const useOmniTransform = shouldUseOmniTransformForV2V(
          meta,
          v2vResolution,
          finalV2vProvider,
        );
        if (useOmniTransform) {
          const videoUrl = await ensureKieAccessibleMediaUrl(
            omniRollout
              ? await resolveOmniSourceVideoUrl(sourceAssetUrl, userId)
              : sourceAssetUrl,
            "video",
          );
          await runOmniStudio(videoUrl);
        } else if (finalV2vProvider === "runway_aleph") {
          await runAleph(sourceAssetUrl, referenceImageUrl);
        } else {
          let videoUrl = await resolveKlingMotionSourceVideoUrl(
            sourceAssetUrl,
            userId,
          );
          let imageUrl = referenceImageUrl;
          if (!imageUrl) {
            imageUrl = await extractReferenceFrameFromVideoUrl(videoUrl, userId);
          }
          if (!imageUrl) {
            throw Object.assign(
              new Error(
                "Impossible de préparer ta vidéo (image de référence). Réessaie avec un clip 3–8 s en 720p.",
              ),
              { status: 422 },
            );
          }
          await runKling(videoUrl, imageUrl);
        }
      } catch (firstErr) {
        await resetVideoProviderClaim(supabase, larp.id, meta);
        const sameFamilyRetry =
          isAlephTransformEnabled() &&
          engineFamily === "transform" &&
          finalV2vProvider === "runway_aleph" &&
          isRetryableAlephError(firstErr);
        if (sameFamilyRetry) {
          await runAleph(sourceAssetUrl, referenceImageUrl);
        } else {
          throw firstErr;
        }
      }
    } else {
      const imageUrl = await ensureKieAccessibleMediaUrl(sourceAssetUrl, "image");
      const audioPrep = await prepareI2VAvatarAudioUrl({
        userId,
        meta,
      });
      const avatarPrompt =
        String(larp.final_prompt || providerPrompt || larp.prompt || "").trim();
      await supabase
        .from("generations")
        .update({
          metadata: {
            ...meta,
            i2v_input_audio_url: audioPrep.url,
            i2v_target_duration_sec: audioPrep.targetSec,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", larp.id);
      await generateVideoOnce(supabase, {
        generationId: larp.id,
        prompt: avatarPrompt,
        imageUrl,
        audioUrl: audioPrep.url,
      });
    }

    const { data: refreshed, error } = await supabase
      .from("generations")
      .select("*")
      .eq("id", larp.id)
      .single();
    if (error) throw error;

    const nextMeta = {
      ...(refreshed.metadata && typeof refreshed.metadata === "object"
        ? refreshed.metadata
        : meta),
      studio_stage: "GENERATING_VIDEO",
      v2v_provider: finalV2vProvider,
      video_kickoff_completed_at: new Date().toISOString(),
    };
    await supabase
      .from("generations")
      .update({ metadata: nextMeta, updated_at: new Date().toISOString() })
      .eq("id", larp.id);

    return { larp: { ...refreshed, metadata: nextMeta }, started: true, failed: false };
  } catch (err) {
    console.error("[video-studio-kickoff] failed", err);
    const raw =
      typeof err.apiMsg === "string"
        ? err.apiMsg
        : err instanceof Error
          ? err.message
          : "Échec création vidéo";
    const friendly =
      mapVideoProviderMessage(raw, "fr") ||
      `${String(raw).slice(0, 180)} Jetons remboursés.`;
    await markVideoKickoffFailed(supabase, userId, larp, friendly);
    return { larp, started: true, failed: true, failMessage: friendly };
  }
}

module.exports = {
  kickoffVideoStudioProvider,
  markVideoKickoffFailed,
  readVideoApiCallCount,
  readKickoffLock,
};
