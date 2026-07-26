const { randomUUID } = require("crypto");
const { requireUser, readBody, sendError } = require("../user-auth");
const { uploadInputImagesToR2 } = require("../r2");
const {
  getOneshotApiConfig,
  getAppSettings,
  isGoogleAiPromptFlagged,
  uploadImageUrlsToOneshot,
  createOneshotJob,
} = require("../oneshot");
const { createKieTask, isKieConfigured } = require("../kie");
const {
  OUTPUT_ASPECT_RATIO,
  checkGenerationLimits,
  getBillableCreditCost,
  deductGenerationCredits,
  refundGenerationCreditsIfCharged,
  recordGeneration,
} = require("../generation");
const { buildIdentityPreservingPrompt, buildLiteralRetryPrompt } = require("../prompt-guard");
const {
  isDisallowedAdultPrompt,
  contentPolicyResponse,
} = require("../content-policy");

function normalizeAspectRatio(value) {
  return value === "16:9" ? "16:9" : OUTPUT_ASPECT_RATIO;
}

async function failAndRefund(supabase, { userId, generationId, failMessage, source }) {
  await supabase
    .from("generations")
    .update({
      status: "failed",
      fail_message: failMessage,
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq("id", generationId);

  await refundGenerationCreditsIfCharged(supabase, {
    userId,
    generationId,
    source,
    failMessage,
  }).catch((err) => console.error("refund failed", err));
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
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const images = Array.isArray(body.images) ? body.images : [];
    const aspectRatio = normalizeAspectRatio(body.aspect_ratio);
    const templateId =
      typeof body.template_id === "string" && body.template_id.trim()
        ? body.template_id.trim()
        : null;

    if (!prompt || prompt.length > 2000) {
      res.status(400).json({ message: "Prompt invalide (1-2000 caractères)" });
      return;
    }

    // 1) Only minors sexual content is blocked — adult/hardcore/weapons/cash must generate.
    if (isDisallowedAdultPrompt(prompt)) {
      res.status(422).json(contentPolicyResponse());
      return;
    }

    // 2) Credit check — before AI.
    const limitResult = await checkGenerationLimits(supabase, userId);
    if (!limitResult.allowed) {
      res.status(403).json({ message: limitResult.reason });
      return;
    }
    const creditCost = getBillableCreditCost(limitResult);

    if (!templateId && images.length === 0) {
      res.status(422).json({
        code: "REFERENCE_IMAGE_REQUIRED",
        message: "Une image de référence est requise.",
      });
      return;
    }

    // Free-prompt path (Generate page): upload user images to R2.
    // Template-driven generations remain on the Express server when available.
    if (templateId && images.length === 0) {
      res.status(422).json({
        code: "REFERENCE_IMAGE_REQUIRED",
        message: "Une image de référence est requise.",
      });
      return;
    }

    const finalPrompt = buildIdentityPreservingPrompt(prompt);
    const imageUrls = await uploadInputImagesToR2(userId, images);

    if (imageUrls.length === 0) {
      res.status(422).json({
        code: "REFERENCE_IMAGE_REQUIRED",
        message: "Une image de référence est requise.",
      });
      return;
    }

    const oneshotConfig = getOneshotApiConfig();
    const appSettings = await getAppSettings(supabase);
    const kieReady = isKieConfigured();

    if (
      (appSettings.forceKieAi || !oneshotConfig.url || !oneshotConfig.key) &&
      !kieReady
    ) {
      res.status(503).json({
        message:
          "Aucun fournisseur d'image configuré (ONESHOT_API_URL/KEY requis).",
      });
      return;
    }

    // 3) Reserve generation row + debit credits BEFORE calling the AI.
    const pendingTaskId = `pending_${randomUUID()}`;
    const { data: larp, error: insertErr } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        template_id: templateId,
        generation_type: "image",
        prompt: finalPrompt,
        final_prompt: finalPrompt,
        provider: "oneshot",
        provider_task_id: pendingTaskId,
        status: "processing",
        aspect_ratio: aspectRatio,
        input_assets: imageUrls,
        credit_cost: creditCost,
        metadata: {},
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    const deductErr = await deductGenerationCredits(supabase, {
      userId,
      creditCost,
      generationId: larp.id,
      metadata: {
        source: "direct_generation",
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

    // 4) Call image provider (credits already reserved).
    let externalTaskId;
    let provider = "oneshot";

    const createWithKie = async (promptOverride) => {
      const kieResponse = await createKieTask({
        prompt: promptOverride || finalPrompt,
        aspect_ratio: aspectRatio,
        image_input: imageUrls,
      });
      if (kieResponse.code !== 200 || !kieResponse.data?.taskId) {
        return null;
      }
      return kieResponse.data.taskId;
    };

    try {
      if (!appSettings.forceKieAi && oneshotConfig.url && oneshotConfig.key) {
        try {
          const referenceFileIds = await uploadImageUrlsToOneshot(imageUrls);
          const oneshotResponse = await createOneshotJob(finalPrompt, {
            aspectRatio,
            ...(referenceFileIds.length > 0 ? { referenceFileIds } : {}),
          });
          if (!oneshotResponse || !oneshotResponse.id) {
            throw new Error("Invalid response from OneshotAPI");
          }
          externalTaskId = `custom_${oneshotResponse.id}`;
        } catch (err) {
          // Provider safety bias: never hard-refuse adult/edgy prompts — retry then Kie.
          if (isGoogleAiPromptFlagged(err)) {
            console.warn(
              "OneshotAPI flagged prompt — retrying unrestricted then Kie",
              err && err.message ? err.message : err,
            );
            try {
              const retryPrompt = buildLiteralRetryPrompt(finalPrompt);
              const referenceFileIds = await uploadImageUrlsToOneshot(imageUrls);
              const retryResponse = await createOneshotJob(retryPrompt, {
                aspectRatio,
                ...(referenceFileIds.length > 0 ? { referenceFileIds } : {}),
              });
              if (retryResponse && retryResponse.id) {
                await supabase
                  .from("generations")
                  .update({
                    final_prompt: retryPrompt,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", larp.id);
                externalTaskId = `custom_${retryResponse.id}`;
              } else {
                throw err;
              }
            } catch (retryErr) {
              if (!kieReady) {
                console.error(
                  "Oneshot retry failed (no Kie fallback configured)",
                  retryErr,
                );
                const failMessage =
                  "Échec provider (filtre). Configure KIE_AI_API_KEY pour un fallback, ou reformule. Jetons remboursés.";
                await failAndRefund(supabase, {
                  userId,
                  generationId: larp.id,
                  failMessage,
                  source: "oneshot_policy_retry_failed",
                });
                res.status(502).json({ message: failMessage });
                return;
              }
              console.error("Oneshot flagged/retry failed, falling back to Kie AI", retryErr);
              provider = "kie";
              const kiePrompt = buildLiteralRetryPrompt(finalPrompt);
              const kieTaskId = await createWithKie(kiePrompt);
              if (!kieTaskId) {
                await failAndRefund(supabase, {
                  userId,
                  generationId: larp.id,
                  failMessage: "Échec de création de la tâche",
                  source: "kie_create_failed",
                });
                res.status(502).json({ message: "Échec de création de la tâche" });
                return;
              }
              await supabase
                .from("generations")
                .update({
                  final_prompt: kiePrompt,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", larp.id);
              externalTaskId = kieTaskId;
            }
          } else if (!kieReady) {
            console.error("OneshotAPI failed (no Kie fallback configured)", err);
            const detail =
              err && err.message
                ? String(err.message).slice(0, 240)
                : "erreur Oneshot";
            const failMessage = `Échec de la génération Oneshot (${detail})`;
            await failAndRefund(supabase, {
              userId,
              generationId: larp.id,
              failMessage,
              source: "oneshot_create_failed",
            });
            res.status(502).json({ message: failMessage });
            return;
          } else {
            console.error("OneshotAPI failed, falling back to Kie AI", err);
            provider = "kie";
            const kieTaskId = await createWithKie();
            if (!kieTaskId) {
              await failAndRefund(supabase, {
                userId,
                generationId: larp.id,
                failMessage: "Échec de création de la tâche",
                source: "kie_create_failed",
              });
              res.status(502).json({ message: "Échec de création de la tâche" });
              return;
            }
            externalTaskId = kieTaskId;
          }
        }
      } else {
        provider = "kie";
        const kieTaskId = await createWithKie();
        if (!kieTaskId) {
          await failAndRefund(supabase, {
            userId,
            generationId: larp.id,
            failMessage: "Échec de création de la tâche",
            source: "kie_create_failed",
          });
          res.status(502).json({ message: "Échec de création de la tâche" });
          return;
        }
        externalTaskId = kieTaskId;
      }
    } catch (providerErr) {
      console.error("provider create failed", providerErr);
      await failAndRefund(supabase, {
        userId,
        generationId: larp.id,
        failMessage: "Échec de création de la tâche",
        source: "provider_create_exception",
      });
      res.status(502).json({ message: "Échec de création de la tâche" });
      return;
    }

    await supabase
      .from("generations")
      .update({
        provider,
        provider_task_id: externalTaskId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", larp.id);

    res.status(201).json({
      id: larp.id,
      taskId: externalTaskId,
      status: "waiting",
      isSubscriber: limitResult.isSubscriber,
    });
  } catch (error) {
    console.error("generate-direct error", error);
    sendError(res, error);
  }
};

module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
  maxDuration: 60,
};
