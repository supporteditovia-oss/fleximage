const { requireUser, sendError } = require("../user-auth");
const { downloadAndStoreImages, downloadAndStoreVideo } = require("../r2");
const {
  getSourceVideoUrlFromLarp,
  muxSourceAudioOntoVideo,
} = require("../mux-source-audio");
const { transformV2vVoiceAndMux } = require("../v2v-voice-transform");
const { applyI2vAdaptiveVoiceAndMux } = require("../i2v-voice");
const {
  isV2vVoiceTransformMode,
  v2vVoiceModeChargesCredits,
} = require("../v2v-voice-pool");
const { VIDEO_VOICE_EXTRA_CREDIT } = require("../video-studio");
const { getRunwayVideoStatus } = require("../kie-runway");
const {
  mapStudioStage,
  studioStageLabel,
} = require("../video-studio");
const {
  getAppSettings,
  isGoogleAiPromptFlagged,
  getOneshotJobStatus,
  ONESHOT_MODEL_VARIANT,
} = require("../oneshot");
const { getKieTaskStatus } = require("../kie");
const { buildVisionQaRetryPrompt } = require("../prompt-guard");
const { maybeRetryAfterVisionQa } = require("../vision-qa");
const {
  OUTPUT_ASPECT_RATIO,
  PROVIDER_POLL_HARD_TIMEOUT_MS,
  PROVIDER_POLL_QA_RETRY_EXTRA_MS,
  refundGenerationCreditsIfCharged,
  refundGenerationCreditsPartial,
  extractImageUrls,
  toAssetList,
  toClientStatus,
  toDbStatus,
  isProviderSuccessStatus,
  isProviderFailStatus,
  withTimeout,
} = require("../generation");

/** Never show "[object Object]" in the UI — coerce provider errors to readable text. */
function sanitizeClientFacingMessage(text) {
  return String(text || "")
    .replace(/\b(Kling|Runway|Aleph|Fish Audio|Fish|TTS|Kie\.ai|Kie)\b/gi, "IA")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function toUserFailMessage(value, fallback = "Échec de la génération") {
  if (value == null || value === "") return fallback;
  if (typeof value === "string") {
    return value === "[object Object]"
      ? fallback
      : sanitizeClientFacingMessage(value);
  }
  if (typeof value === "object") {
    if (typeof value.message === "string" && value.message) return value.message;
    if (typeof value.error === "string" && value.error) return value.error;
    if (typeof value.msg === "string" && value.msg) return value.msg;
    try {
      const s = JSON.stringify(value);
      if (s && s !== "{}" && s !== "null") return s.slice(0, 280);
    } catch {
      /* ignore */
    }
  }
  const s = String(value);
  return s === "[object Object]" ? fallback : s;
}

function statusTimingFields(larp) {
  const meta =
    larp && larp.metadata && typeof larp.metadata === "object" ? larp.metadata : {};
  const estimatedRaw = meta.estimated_seconds;
  const estimatedSeconds =
    estimatedRaw != null && Number.isFinite(Number(estimatedRaw))
      ? Number(estimatedRaw)
      : null;
  const qaRetryCount = Number(meta.vision_qa_retry_count || 0);
  let remainingSeconds = null;
  if (estimatedSeconds != null && larp && larp.created_at) {
    const elapsed = Math.max(
      0,
      Math.floor((Date.now() - new Date(larp.created_at).getTime()) / 1000),
    );
    remainingSeconds = Math.max(0, estimatedSeconds - elapsed);
  }
  return { estimatedSeconds, qaRetryCount, remainingSeconds, createdAt: larp.created_at || null };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const { supabase, userId } = await requireUser(req);
    const taskId = req.query.taskId;
    if (!taskId || typeof taskId !== "string") {
      res.status(400).json({ message: "taskId requis" });
      return;
    }

    const { data: larp, error: fetchErr } = await supabase
      .from("generations")
      .select("*")
      .ilike("provider_task_id", `%${taskId}%`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const taskIdSegments = (larp?.provider_task_id || "")
      .split(",")
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (fetchErr || !larp || !taskIdSegments.includes(taskId)) {
      res.status(404).json({ message: "Tâche introuvable" });
      return;
    }

    const resultType = larp.generation_type === "video" ? "video" : "image";

    if (larp.status === "succeeded" || larp.status === "failed") {
      if (larp.status === "failed") {
        await refundGenerationCreditsIfCharged(supabase, {
          userId,
          generationId: larp.id,
          source: "cached_failed_status",
          failMessage: larp.fail_message,
        }).catch((err) => console.error("refund failed", err));
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_subscriber, role")
        .eq("id", userId)
        .single();
      const isSubscriber = Boolean(
        profile?.is_subscriber || profile?.role === "admin",
      );
      const originals = toAssetList(larp.output_assets);
      const watermarkedList = toAssetList(larp.watermarked_assets);
      const resolvedUrls =
        watermarkedList.length > 0 && !isSubscriber
          ? watermarkedList
          : originals.length > 0
            ? originals
            : watermarkedList;

      res.status(200).json({
        larpId: larp.id,
        ...statusTimingFields(larp),
        status: toClientStatus(larp.status),
        resultUrls: resolvedUrls,
        watermarkedUrls: watermarkedList,
        failMessage: larp.fail_message,
        costTime: larp.cost_time == null ? null : Number(larp.cost_time),
        isSubscriber,
        requiresPaywall: false,
        resultType,
      });
      return;
    }

    const taskParts = (larp.provider_task_id || "").split(",");
    const activeTaskId = taskParts[taskParts.length - 1] || "";
    const ageInMs = Date.now() - new Date(larp.created_at).getTime();

    // Soft-retry / vision-QA claim can get stuck forever if the process dies mid-claim.
    if (activeTaskId === "__claiming__" || activeTaskId === "__vision_qa_claim__") {
      if (ageInMs < 90_000) {
        res.status(200).json({
          larpId: larp.id,
          ...statusTimingFields(larp),
          status: "waiting",
          resultUrls: [],
          failMessage: null,
          costTime: null,
          isSubscriber: false,
          requiresPaywall: false,
          resultType,
        });
        return;
      }
      // Claim stuck → hard fail + refund below.
      await supabase
        .from("generations")
        .update({
          status: "failed",
          fail_message:
            "Génération bloquée (retry). Réessaie — jetons remboursés.",
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", larp.id);
      await refundGenerationCreditsIfCharged(supabase, {
        userId,
        generationId: larp.id,
        source: "stuck_claim",
        failMessage: "stuck claiming",
      }).catch((err) => console.error("refund failed", err));
      res.status(200).json({
        larpId: larp.id,
        ...statusTimingFields(larp),
        status: "fail",
        resultUrls: [],
        failMessage:
          "Génération bloquée (retry). Réessaie — jetons remboursés.",
        costTime: null,
        isSubscriber: false,
        requiresPaywall: false,
        resultType,
      });
      return;
    }
    const pollMeta =
      larp.metadata && typeof larp.metadata === "object" ? larp.metadata : {};
    const isVideoTask = activeTaskId.startsWith("video_");
    const isAlephTask = activeTaskId.startsWith("aleph_");
    const isKlingTask = activeTaskId.startsWith("kling_");
    let apiStatus = "waiting";
    let apiResultJson = null;
    let apiFailMsg = null;
    let apiCostTime = null;

    if (isKlingTask) {
      const {
        getKlingMotionStatus,
        mapKlingMotionState,
        extractKlingMotionVideoUrl,
      } = require("../kie-kling-motion");
      const klingTaskId = activeTaskId.replace("kling_", "");
      try {
        const klingData = await getKlingMotionStatus(klingTaskId);
        const state = mapKlingMotionState(klingData);
        const videoUrl = extractKlingMotionVideoUrl(klingData);
        if (state === "success") {
          apiStatus = "success";
          if (videoUrl) {
            apiResultJson = JSON.stringify({ video_url: videoUrl });
          }
        } else if (state === "fail") {
          apiStatus = "fail";
          apiFailMsg = toUserFailMessage(
            klingData.failMsg,
            "Échec de la transformation vidéo",
          );
        } else if (ageInMs > PROVIDER_POLL_HARD_TIMEOUT_MS) {
          apiStatus = "fail";
          apiFailMsg =
            "Génération trop longue (timeout). Réessaie — jetons remboursés.";
        }
      } catch (err) {
        console.error("Failed to poll Kling video", err);
        if (ageInMs < PROVIDER_POLL_HARD_TIMEOUT_MS) {
          const stage = mapStudioStage(pollMeta, "generating");
          res.status(200).json({
            larpId: larp.id,
            ...statusTimingFields(larp),
            status: "waiting",
            studioStage: stage,
            studioStageLabel: studioStageLabel(stage),
            resultUrls: [],
            failMessage: null,
            costTime: null,
            isSubscriber: false,
            requiresPaywall: false,
            resultType,
          });
          return;
        }
        apiStatus = "fail";
        apiFailMsg = "Erreur de génération vidéo";
      }
    } else if (isAlephTask) {
      const {
        getAlephVideoStatus,
        mapAlephState,
        extractAlephVideoUrl,
      } = require("../kie-runway-aleph");
      const alephTaskId = activeTaskId.replace("aleph_", "");
      try {
        const alephData = await getAlephVideoStatus(alephTaskId);
        const state = mapAlephState(alephData);
        const videoUrl = extractAlephVideoUrl(alephData);
        if (state === "success") {
          apiStatus = "success";
          if (videoUrl) {
            apiResultJson = JSON.stringify({ video_url: videoUrl });
          }
        } else if (state === "fail") {
          apiStatus = "fail";
          apiFailMsg = toUserFailMessage(
            alephData.errorMessage,
            "Échec de la transformation vidéo",
          );
        } else if (ageInMs > PROVIDER_POLL_HARD_TIMEOUT_MS) {
          apiStatus = "fail";
          apiFailMsg =
            "Génération trop longue (timeout). Réessaie — jetons remboursés.";
        }
      } catch (err) {
        console.error("Failed to poll Aleph video", err);
        if (ageInMs < PROVIDER_POLL_HARD_TIMEOUT_MS) {
          const stage = mapStudioStage(pollMeta, "generating");
          res.status(200).json({
            larpId: larp.id,
            ...statusTimingFields(larp),
            status: "waiting",
            studioStage: stage,
            studioStageLabel: studioStageLabel(stage),
            resultUrls: [],
            failMessage: null,
            costTime: null,
            isSubscriber: false,
            requiresPaywall: false,
            resultType,
          });
          return;
        }
        apiStatus = "fail";
        apiFailMsg = "Erreur de génération vidéo";
      }
    } else if (isVideoTask) {
      const runwayTaskId = activeTaskId.replace("video_", "");
      try {
        const runwayData = await getRunwayVideoStatus(runwayTaskId);
        const state = runwayData.state ?? runwayData.status ?? "waiting";
        const videoUrl =
          runwayData.videoInfo?.videoUrl ?? runwayData.video_url ?? null;
        if (state === "success" || state === "completed") {
          apiStatus = "success";
          if (videoUrl) {
            apiResultJson = JSON.stringify({ video_url: videoUrl });
          }
        } else if (state === "fail" || state === "failed") {
          apiStatus = "fail";
          apiFailMsg = toUserFailMessage(
            runwayData.failMsg || runwayData.fail_reason,
            "Échec de la génération vidéo",
          );
        } else if (ageInMs > PROVIDER_POLL_HARD_TIMEOUT_MS) {
          apiStatus = "fail";
          apiFailMsg =
            "Génération trop longue (timeout). Réessaie — jetons remboursés.";
        }
      } catch (err) {
        console.error("Failed to poll Runway video", err);
        if (ageInMs < PROVIDER_POLL_HARD_TIMEOUT_MS) {
          const stage = mapStudioStage(pollMeta, "generating");
          res.status(200).json({
            larpId: larp.id,
            ...statusTimingFields(larp),
            status: "waiting",
            studioStage: stage,
            studioStageLabel: studioStageLabel(stage),
            resultUrls: [],
            failMessage: null,
            costTime: null,
            isSubscriber: false,
            requiresPaywall: false,
            resultType,
          });
          return;
        }
        apiStatus = "fail";
        apiFailMsg = "Erreur de polling vidéo";
      }
    } else if (activeTaskId.startsWith("custom_")) {
      const jobId = activeTaskId.replace("custom_", "");
      const currentSettings = await getAppSettings(supabase);
      const isTimeout = ageInMs > currentSettings.fallbackTimeoutMs;

      let customStatus;
      try {
        customStatus = await getOneshotJobStatus(jobId);
      } catch (err) {
        console.error("Failed to poll OneshotAPI", err);
        if (isGoogleAiPromptFlagged(err)) {
          customStatus = {
            status: "failed",
            error:
              err instanceof Error ? err.message : String(err),
          };
        } else if (isTimeout) {
          customStatus = {
            status: "failed",
            error: "Timeout provider",
          };
        } else {
          // Transient network/5xx — keep waiting (mirrors Kie poll path).
          res.status(200).json({
            larpId: larp.id,
            ...statusTimingFields(larp),
            status: "waiting",
            resultUrls: [],
            failMessage: null,
            costTime: null,
            isSubscriber: false,
            requiresPaywall: false,
            resultType,
          });
          return;
        }
      }

      const isCustomApiFailed = isProviderFailStatus(customStatus.status);

      if (isProviderSuccessStatus(customStatus.status)) {
        apiStatus = "success";
        apiResultJson = JSON.stringify(customStatus);
      } else if (isCustomApiFailed) {
        // OneShot: never spawn a 2nd paid job on poll failure — user must start a new action.
        apiStatus = "fail";
        apiFailMsg = toUserFailMessage(
          customStatus && customStatus.error,
          "Échec de la génération. Clique sur « Nouvelle génération » pour réessayer.",
        );
        console.warn("[status] oneshot poll failed — no auto-retry", {
          larpId: larp.id,
          generationRequestId:
            larp.metadata && typeof larp.metadata === "object"
              ? larp.metadata.generation_request_id
              : null,
          error: apiFailMsg,
        });
      }
    } else {
      try {
        const kieStatus = await getKieTaskStatus(activeTaskId);
        apiStatus = kieStatus.data.state;
        if (kieStatus.data.resultJson) {
          apiResultJson = kieStatus.data.resultJson;
        }
        apiFailMsg = kieStatus.data.failMsg;
        apiCostTime = kieStatus.data.costTime;
      } catch (err) {
        console.error("Failed to poll Kie.ai", err);
        if (
          Date.now() - new Date(larp.created_at).getTime() <
          PROVIDER_POLL_HARD_TIMEOUT_MS
        ) {
          res.status(200).json({
            larpId: larp.id,
            ...statusTimingFields(larp),
            status: "waiting",
            resultUrls: [],
            failMessage: null,
            costTime: null,
            isSubscriber: false,
            requiresPaywall: false,
            resultType,
          });
          return;
        }
        apiStatus = "fail";
        apiFailMsg = "Erreur de polling";
      }
    }

    const qaRetryCount = Number(pollMeta.vision_qa_retry_count || 0);
    const softRetryCount = Number(
      pollMeta.oneshot_soft_retry_count || (pollMeta.oneshot_soft_retry ? 1 : 0),
    );
    const effectiveHardTimeout =
      PROVIDER_POLL_HARD_TIMEOUT_MS +
      (qaRetryCount + softRetryCount) * PROVIDER_POLL_QA_RETRY_EXTRA_MS;

    if (apiStatus === "waiting" && ageInMs > effectiveHardTimeout) {
      // Prefer delivering the last vision-QA attempt over a blank timeout fail.
      const rejected = Array.isArray(pollMeta.vision_qa_rejected_assets)
        ? pollMeta.vision_qa_rejected_assets.filter(Boolean)
        : [];
      if (rejected.length > 0) {
        console.warn(
          "[status] hard timeout with prior QA assets — delivering last attempt",
          { larpId: larp.id, qaRetryCount, ageInMs },
        );
        apiStatus = "success";
        apiResultJson = JSON.stringify({ resultUrls: rejected });
        apiFailMsg = null;
      } else {
        apiStatus = "fail";
        apiFailMsg =
          "Génération trop longue (timeout). Réessaie — jetons remboursés.";
      }
    }

    if (apiStatus === "success" || apiStatus === "fail") {
      let resultUrls = [];
      let metadataPatch = {};
      if (apiStatus === "success" && apiResultJson) {
        try {
          const parsed =
            typeof apiResultJson === "string"
              ? JSON.parse(apiResultJson)
              : apiResultJson;
          if (resultType === "video" && parsed && parsed.video_url) {
            const stored = await withTimeout(
              downloadAndStoreVideo(larp.id, parsed.video_url),
              20_000,
              null,
            );
            resultUrls =
              Array.isArray(stored) && stored.length > 0
                ? stored
                : [parsed.video_url];

            const meta =
              larp.metadata && typeof larp.metadata === "object"
                ? larp.metadata
                : {};
            const voiceMode =
              meta.v2v_voice_mode ||
              (meta.preserve_source_audio ? "preserve" : "none");
            if (meta.workflow === "video_to_video" && resultUrls[0]) {
              const sourceVideoUrl = getSourceVideoUrlFromLarp(larp);

              if (sourceVideoUrl && voiceMode === "preserve") {
                const muxedUrl = await withTimeout(
                  muxSourceAudioOntoVideo({
                    sourceVideoUrl,
                    generatedVideoUrl: resultUrls[0],
                    larpId: larp.id,
                  }),
                  90_000,
                  null,
                );
                if (muxedUrl) {
                  resultUrls = [muxedUrl];
                  metadataPatch.source_audio_muxed = true;
                } else {
                  metadataPatch.source_audio_mux_failed = true;
                }
              } else if (
                sourceVideoUrl &&
                isV2vVoiceTransformMode(voiceMode)
              ) {
                const transformed = await withTimeout(
                  transformV2vVoiceAndMux({
                    sourceVideoUrl,
                    generatedVideoUrl: resultUrls[0],
                    larpId: larp.id,
                    voiceMode,
                    swapPrompt: meta.vehicle_prompt || larp.prompt || "",
                  }),
                  120_000,
                  null,
                );
                if (transformed?.url) {
                  resultUrls = [transformed.url];
                  metadataPatch.source_audio_transformed = true;
                  metadataPatch.voice_transform_gender = transformed.gender;
                  metadataPatch.voice_transform_fish_id =
                    transformed.fishReferenceId;
                  metadataPatch.voice_transform_transcript =
                    transformed.transcript;
                } else {
                  metadataPatch.voice_transform_failed = true;
                }
                metadataPatch.voice_transform_pending = false;
              }

            } else if (
              meta.workflow === "image_to_video" &&
              meta.voice_enabled === true &&
              resultUrls[0]
            ) {
              const sourceImageUrl =
                meta.source_image_url ||
                (Array.isArray(larp.input_assets) ? larp.input_assets[0] : null);
              if (sourceImageUrl) {
                const i2vVoice = await withTimeout(
                  applyI2vAdaptiveVoiceAndMux({
                    generatedVideoUrl: resultUrls[0],
                    larpId: larp.id,
                    sourceImageUrl,
                    motionPrompt: larp.prompt || "",
                    voiceText: meta.voice_text || "",
                  }),
                  120_000,
                  null,
                );
                if (i2vVoice?.url) {
                  resultUrls = [i2vVoice.url];
                  metadataPatch.i2v_voice_applied = true;
                  metadataPatch.i2v_voice_category = i2vVoice.voiceCategory;
                  metadataPatch.i2v_voice_line = i2vVoice.voiceLine;
                } else {
                  metadataPatch.i2v_voice_failed = true;
                }
                metadataPatch.voice_transform_pending = false;
              }
            }

            const voiceAddonFailed =
              metadataPatch.source_audio_mux_failed === true ||
              metadataPatch.voice_transform_failed === true ||
              metadataPatch.i2v_voice_failed === true;
            if (voiceAddonFailed) {
              const billedVoiceMode =
                meta.workflow === "video_to_video"
                  ? voiceMode ||
                    (meta.preserve_source_audio ? "preserve" : "none")
                  : null;
              const shouldRefundVoiceAddon =
                (meta.workflow === "video_to_video" &&
                  v2vVoiceModeChargesCredits(billedVoiceMode)) ||
                (meta.workflow === "image_to_video" && meta.voice_enabled === true);
              if (shouldRefundVoiceAddon) {
                  const partialErr = await refundGenerationCreditsPartial(
                    supabase,
                    {
                      userId,
                      generationId: larp.id,
                      amount: VIDEO_VOICE_EXTRA_CREDIT,
                      idempotencyKey: `generation:${larp.id}:refund_voice_addon`,
                      source: metadataPatch.i2v_voice_failed
                        ? "i2v_voice_failed"
                        : metadataPatch.voice_transform_failed
                          ? "voice_transform_failed"
                          : "source_audio_mux_failed",
                      failMessage: metadataPatch.i2v_voice_failed
                        ? "Voix adaptée non appliquée — remboursement partiel"
                        : metadataPatch.voice_transform_failed
                          ? "Voix IA non appliquée — remboursement partiel"
                          : "Voix filmée non intégrée — remboursement partiel",
                    },
                  ).catch((err) => {
                    console.error("voice addon partial refund failed", err);
                    return err;
                  });
                  if (!partialErr) {
                    metadataPatch.voice_addon_refunded = true;
                    metadataPatch.voice_addon_refund_credits =
                      VIDEO_VOICE_EXTRA_CREDIT;
                  }
                }
              }
          } else {
            resultUrls = extractImageUrls(parsed);
          }
        } catch (parseErr) {
          console.error("Failed to parse result JSON", parseErr);
        }

        if (resultUrls.length > 0 && resultType !== "video") {
          try {
            const stored = await withTimeout(
              downloadAndStoreImages(larp.id, resultUrls),
              4_000,
              null,
            );
            if (Array.isArray(stored) && stored.length > 0) {
              resultUrls = stored;
            }
          } catch (err) {
            console.error("Failed to store images to R2", err);
          }
        }

        if (resultUrls.length === 0) {
          apiStatus = "fail";
          apiFailMsg =
            resultType === "video"
              ? "Aucune vidéo dans le résultat"
              : "Aucune image dans le résultat";
        } else if (larp.generation_type !== "video") {
          // Vision QA: skip modèles prêts (builtin) — one image only, no auto-retry.
          const meta =
            larp.metadata && typeof larp.metadata === "object"
              ? larp.metadata
              : {};
          const isBuiltinReadyModel = Boolean(meta.builtin_template_id);
          if (!isBuiltinReadyModel) {
            const qaModelVariant =
              meta.oneshot_model_variant || ONESHOT_MODEL_VARIANT;
            const qaDecision = await withTimeout(
              maybeRetryAfterVisionQa({
                supabase,
                larp,
                resultUrls,
                buildVisionQaRetryPrompt,
                aspectRatio: larp.aspect_ratio || OUTPUT_ASPECT_RATIO,
                modelVariant: qaModelVariant,
              }),
              18_000,
              { action: "accept", qa: { skipped: true, reason: "timeout" } },
            );

            if (qaDecision && qaDecision.action === "busy") {
              res.status(200).json({
                larpId: larp.id,
                ...statusTimingFields(larp),
                status: "waiting",
                resultUrls: [],
                failMessage: null,
                costTime: null,
                isSubscriber: false,
                requiresPaywall: false,
                resultType,
              });
              return;
            }

            if (qaDecision && qaDecision.action === "retry") {
              res.status(200).json({
                larpId: larp.id,
                ...statusTimingFields(larp),
                status: "waiting",
                resultUrls: [],
                failMessage: null,
                costTime: null,
                isSubscriber: false,
                requiresPaywall: false,
                resultType,
              });
              return;
            }
          }
        }
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_subscriber, role")
        .eq("id", userId)
        .single();
      const isSubscriber = Boolean(
        profile?.is_subscriber || profile?.role === "admin",
      );

      const terminalMeta =
        apiStatus === "success"
          ? {
              ...pollMeta,
              ...metadataPatch,
              ...(resultType === "video" ? { studio_stage: "COMPLETED" } : {}),
            }
          : pollMeta;

      await supabase
        .from("generations")
        .update({
          status: toDbStatus(apiStatus),
          output_assets: resultUrls,
          watermarked_assets: [],
          fail_message: toUserFailMessage(apiFailMsg, null) || null,
          cost_time: apiCostTime == null ? null : Number(apiCostTime),
          metadata: terminalMeta,
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", larp.id);

      if (apiStatus === "fail") {
        await refundGenerationCreditsIfCharged(supabase, {
          userId,
          generationId: larp.id,
          source: "failed_generation",
          failMessage: toUserFailMessage(apiFailMsg, null) || apiFailMsg,
        }).catch((err) => console.error("refund failed", err));
      }

      const partialVoiceRefund =
        apiStatus === "success" &&
        metadataPatch.voice_addon_refunded === true &&
        Number(metadataPatch.voice_addon_refund_credits) > 0
          ? Number(metadataPatch.voice_addon_refund_credits)
          : 0;

      res.status(200).json({
        larpId: larp.id,
        ...statusTimingFields(larp),
        status: apiStatus,
        resultUrls,
        watermarkedUrls: [],
        failMessage: toUserFailMessage(apiFailMsg, null) || apiFailMsg,
        costTime: apiCostTime == null ? null : Number(apiCostTime),
        isSubscriber,
        requiresPaywall: false,
        resultType,
        creditsPartialRefund: partialVoiceRefund || undefined,
        partialRefundMessage:
          partialVoiceRefund > 0
            ? `Option voix non appliquée — ${partialVoiceRefund} crédits remboursés.`
            : undefined,
      });
      return;
    }

    res.status(200).json({
      larpId: larp.id,
      ...statusTimingFields(larp),
      status: "waiting",
      resultUrls: [],
      failMessage: null,
      costTime: null,
      isSubscriber: false,
      requiresPaywall: false,
      resultType,
    });
  } catch (error) {
    console.error("larp status error", error);
    sendError(res, error);
  }
};
