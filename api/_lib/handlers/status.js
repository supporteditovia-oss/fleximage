const { requireUser, sendError } = require("../user-auth");
const { downloadAndStoreImages } = require("../r2");
const {
  getAppSettings,
  isGoogleAiPromptFlagged,
  getOneshotJobStatus,
} = require("../oneshot");
const { createKieTask, getKieTaskStatus } = require("../kie");
const {
  OUTPUT_ASPECT_RATIO,
  PROVIDER_POLL_HARD_TIMEOUT_MS,
  refundGenerationCreditsIfCharged,
  extractImageUrls,
  toAssetList,
  toClientStatus,
  toDbStatus,
} = require("../generation");

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
      .single();

    const taskIdSegments = (larp?.provider_task_id || "")
      .split(",")
      .map((segment) => segment.trim());

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

    const activeTaskId = (larp.provider_task_id || "").split(",").pop();
    if (activeTaskId === "__claiming__") {
      res.status(200).json({
        larpId: larp.id,
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
    const isCustomApi = activeTaskId.startsWith("custom_");
    let apiStatus = "waiting";
    let apiResultJson = null;
    let apiFailMsg = null;
    let apiCostTime = null;

    if (isCustomApi) {
      const jobId = activeTaskId.replace("custom_", "");
      const currentSettings = await getAppSettings(supabase);
      const ageInMs = Date.now() - new Date(larp.created_at).getTime();
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

      const isCustomApiFailed =
        customStatus.status === "failed" || customStatus.status === "fail";
      const isPolicyViolation =
        isCustomApiFailed && isGoogleAiPromptFlagged(customStatus);

      if (
        customStatus.status === "completed" ||
        customStatus.status === "success"
      ) {
        apiStatus = "success";
        apiResultJson = JSON.stringify(customStatus);
      } else if (isCustomApiFailed || isTimeout) {
        if (isPolicyViolation) {
          apiStatus = "fail";
          apiFailMsg = "Prompt refusé par la politique de sécurité.";
        } else {
          // Atomic claim so concurrent polls don't each create a Kie task
          // then race to mark the generation failed.
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
            // Another poll already claimed / moved to Kie.
            res.status(200).json({
              larpId: larp.id,
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

          try {
            const imageUrls = Array.isArray(larp.input_assets)
              ? larp.input_assets
              : [];
            const fallbackKieResponse = await createKieTask({
              prompt: larp.final_prompt,
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
                  updated_at: new Date().toISOString(),
                })
                .eq("id", larp.id);

              res.status(200).json({
                larpId: larp.id,
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
            console.error("Kie fallback failed", fallbackErr);
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

    if (apiStatus === "success" || apiStatus === "fail") {
      let resultUrls = [];
      if (apiStatus === "success" && apiResultJson) {
        try {
          const parsed =
            typeof apiResultJson === "string"
              ? JSON.parse(apiResultJson)
              : apiResultJson;
          resultUrls = extractImageUrls(parsed);
        } catch (parseErr) {
          console.error("Failed to parse result JSON", parseErr);
        }

        if (resultUrls.length > 0) {
          try {
            resultUrls = await downloadAndStoreImages(larp.id, resultUrls);
          } catch (err) {
            console.error("Failed to store images to R2", err);
          }
        }

        if (resultUrls.length === 0) {
          apiStatus = "fail";
          apiFailMsg = "Aucune image dans le résultat";
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

      await supabase
        .from("generations")
        .update({
          status: toDbStatus(apiStatus),
          output_assets: resultUrls,
          watermarked_assets: [],
          fail_message: apiFailMsg || null,
          cost_time: apiCostTime == null ? null : Number(apiCostTime),
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", larp.id);

      if (apiStatus === "fail") {
        await refundGenerationCreditsIfCharged(supabase, {
          userId,
          generationId: larp.id,
          source: "failed_generation",
          failMessage: apiFailMsg,
        }).catch((err) => console.error("refund failed", err));
      }

      res.status(200).json({
        larpId: larp.id,
        status: apiStatus,
        resultUrls,
        watermarkedUrls: [],
        failMessage: apiFailMsg,
        costTime: apiCostTime == null ? null : Number(apiCostTime),
        isSubscriber,
        requiresPaywall: false,
        resultType: "image",
      });
      return;
    }

    res.status(200).json({
      larpId: larp.id,
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
