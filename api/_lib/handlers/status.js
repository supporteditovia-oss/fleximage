const { requireUser, sendError } = require("../user-auth");
const { downloadAndStoreImages, downloadAndStoreVideo } = require("../r2");
const { getRunwayVideoStatus } = require("../kie-runway");
const {
  mapStudioStage,
  studioStageLabel,
} = require("../video-studio");
const {
  getAppSettings,
  isGoogleAiPromptFlagged,
  getOneshotJobStatus,
  uploadImageUrlsToOneshot,
  createOneshotJob,
  ONESHOT_MODEL_VARIANT,
} = require("../oneshot");
const { createKieTask, getKieTaskStatus, isKieConfigured } = require("../kie");
const { buildLiteralRetryPrompt, buildFacialHairHardRetryPrompt, isFacialHairPrompt, isAddAnimalPrompt, isMotorcycleRidePrompt, isMotorcycleReplacePrompt, isFictionalVehiclePrompt, needsProModelVariant, buildVisionQaRetryPrompt } = require("../prompt-guard");
const { maybeRetryAfterVisionQa } = require("../vision-qa");
const {
  OUTPUT_ASPECT_RATIO,
  PROVIDER_POLL_HARD_TIMEOUT_MS,
  PROVIDER_POLL_QA_RETRY_EXTRA_MS,
  refundGenerationCreditsIfCharged,
  extractImageUrls,
  toAssetList,
  toClientStatus,
  toDbStatus,
  isProviderSuccessStatus,
  isProviderFailStatus,
  withTimeout,
} = require("../generation");

/** Never show "[object Object]" in the UI — coerce provider errors to readable text. */
function toUserFailMessage(value, fallback = "Échec de la génération") {
  if (value == null || value === "") return fallback;
  if (typeof value === "string") {
    return value === "[object Object]" ? fallback : value;
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
        resultType: larp.generation_type === "video" ? "video" : "image",
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
          resultType: "image",
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
        resultType: "image",
      });
      return;
    }
    const resultType = larp.generation_type === "video" ? "video" : "image";
    const pollMeta =
      larp.metadata && typeof larp.metadata === "object" ? larp.metadata : {};
    const isVideoTask = activeTaskId.startsWith("video_");
    let apiStatus = "waiting";
    let apiResultJson = null;
    let apiFailMsg = null;
    let apiCostTime = null;

    if (isVideoTask) {
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
            resultType: "image",
          });
          return;
        }
      }

      const isCustomApiFailed = isProviderFailStatus(customStatus.status);

      if (isProviderSuccessStatus(customStatus.status)) {
        apiStatus = "success";
        apiResultJson = JSON.stringify(customStatus);
      } else if (isCustomApiFailed) {
        const meta =
          larp.metadata && typeof larp.metadata === "object" ? larp.metadata : {};
        const softRetryCount = Number(
          meta.oneshot_soft_retry_count || (meta.oneshot_soft_retry ? 1 : 0),
        );
        const alreadySoftRetried = softRetryCount >= 1;

        // OneShot: never spawn a 2nd job on poll failure (duplicate spend).
        if (!isKieConfigured() || alreadySoftRetried) {
          apiStatus = "fail";
          apiFailMsg = toUserFailMessage(
            customStatus && customStatus.error,
            isKieConfigured()
              ? "Échec de la génération"
              : "Échec Oneshot (pas de fallback Kie configuré)",
          );
        } else {
          const oneshotTaskId = larp.provider_task_id;
          const claimMarker = `${oneshotTaskId},__claiming__`;
          const { data: claimedRows, error: claimErr } = await supabase
            .from("generations")
            .update({
              provider: "fallback",
              provider_task_id: claimMarker,
              updated_at: new Date().toISOString(),
            })
            .eq("id", larp.id)
            .eq("provider", "oneshot")
            .select("id");

          if (claimErr) {
            console.error("fallback claim failed", claimErr);
          }

          if (!claimedRows || claimedRows.length === 0) {
            res.status(200).json({
              larpId: larp.id,
              ...statusTimingFields(larp),
              status: "waiting",
              resultUrls: [],
              failMessage: null,
              costTime: null,
              isSubscriber: false,
              requiresPaywall: false,
              resultType: "image",
            });
            return;
          }

          const imageUrls = Array.isArray(larp.input_assets)
            ? larp.input_assets
            : [];
          const fallbackPrompt = buildLiteralRetryPrompt(
            String(larp.final_prompt || ""),
          );

          try {
            const fallbackKieResponse = await createKieTask({
              prompt: fallbackPrompt,
              aspect_ratio: larp.aspect_ratio || OUTPUT_ASPECT_RATIO,
              ...(imageUrls.length > 0 ? { image_input: imageUrls } : {}),
            });

            if (
              fallbackKieResponse.code === 200 &&
              fallbackKieResponse.data?.taskId
            ) {
              const newKieTaskIdString = `${oneshotTaskId},${fallbackKieResponse.data.taskId}`;
              await supabase
                .from("generations")
                .update({
                  provider: "fallback",
                  provider_task_id: newKieTaskIdString,
                  final_prompt: fallbackPrompt,
                  metadata: {
                    ...meta,
                    oneshot_soft_retry: true,
                    oneshot_soft_retry_count: softRetryCount + 1,
                  },
                  updated_at: new Date().toISOString(),
                })
                .eq("id", larp.id);

              res.status(200).json({
                larpId: larp.id,
                ...statusTimingFields(larp),
                status: "waiting",
                resultUrls: [],
                failMessage: null,
                costTime: null,
                isSubscriber: false,
                requiresPaywall: false,
                resultType: "image",
              });
              return;
            }

            const kieMsg =
              fallbackKieResponse && fallbackKieResponse.msg
                ? String(fallbackKieResponse.msg)
                : "réponse invalide";
            apiStatus = "fail";
            apiFailMsg = `Échec du fallback (${kieMsg})`;
          } catch (fallbackErr) {
            console.error("provider fallback failed", fallbackErr);
            apiStatus = "fail";
            apiFailMsg = `Échec du fallback (${
              fallbackErr && fallbackErr.message
                ? fallbackErr.message
                : "erreur"
            })`;
          }
        }
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
            resultType: "image",
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
                uploadImageUrlsToOneshot,
                createOneshotJob,
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
                resultType: "image",
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
                resultType: "image",
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
        apiStatus === "success" && resultType === "video"
          ? {
              ...pollMeta,
              studio_stage: "COMPLETED",
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
        resultType: "image",
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
      resultType: "image",
    });
  } catch (error) {
    console.error("larp status error", error);
    sendError(res, error);
  }
};
