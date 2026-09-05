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
  translateLimitReason,
} = require("../generation");
const { buildIdentityPreservingPrompt, buildLiteralRetryPrompt, buildFacialHairHardRetryPrompt, isFacialHairPrompt, isAddAnimalPrompt, isShopifyTrophyPrompt, isMotorcycleRidePrompt, isMotorcycleReplacePrompt, isFictionalVehiclePrompt, needsProModelVariant, estimateGenerationSeconds } = require("../prompt-guard");
const {
  isDisallowedAdultPrompt,
  contentPolicyResponse,
} = require("../content-policy");
const { resolveRequestLocale, copy } = require("../locale-copy");
const { resolveTemplateGeneration } = require("../template-refs");
const {
  isBuiltinTemplateId,
  resolveBuiltinTemplateGeneration,
} = require("../builtin-image-templates");

function normalizeAspectRatio(value) {
  return value === "16:9" ? "16:9" : OUTPUT_ASPECT_RATIO;
}

/** Official Shopify shopping-bag award shape (public static asset). */
function resolveShopifyTrophyRefUrl() {
  const base =
    process.env.PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VITE_SITE_URL ||
    "https://www.luxeflexia.com";
  return `${String(base).replace(/\/$/, "")}/assets/shopify-trophy-ref.jpg`;
}

function withShopifyTrophyReference(prompt, imageUrls) {
  if (!isShopifyTrophyPrompt(prompt)) return imageUrls;
  const trophyUrl = resolveShopifyTrophyRefUrl();
  if (imageUrls.includes(trophyUrl)) return imageUrls;
  return [...imageUrls, trophyUrl];
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
    const uiLocale = resolveRequestLocale(req, body);
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const images = Array.isArray(body.images) ? body.images : [];
    const aspectRatio = normalizeAspectRatio(body.aspect_ratio);
    const templateId =
      typeof body.template_id === "string" && body.template_id.trim()
        ? body.template_id.trim()
        : null;

    if (!prompt || prompt.length > 2000) {
      res.status(400).json({
        message: copy(
          uiLocale,
          "Prompt invalide (1-2000 caractères)",
          "Invalid prompt (1-2000 characters)",
        ),
      });
      return;
    }

    // 1) Only minors sexual content is blocked — adult/hardcore/weapons/cash must generate.
    if (isDisallowedAdultPrompt(prompt)) {
      res.status(422).json(contentPolicyResponse(uiLocale));
      return;
    }

    // 2) Credit check — before AI.
    const limitResult = await checkGenerationLimits(supabase, userId);
    if (!limitResult.allowed) {
      res.status(403).json({
        message: translateLimitReason(limitResult.reason, uiLocale),
      });
      return;
    }
    const creditCost = getBillableCreditCost(limitResult);

    if (!templateId && images.length === 0) {
      res.status(422).json({
        code: "REFERENCE_IMAGE_REQUIRED",
        message: copy(
          uiLocale,
          "Une image de référence est requise.",
          "A reference image is required.",
        ),
      });
      return;
    }

    const uploadedUrls = await uploadInputImagesToR2(userId, images);

    // Modèle prêt à l'emploi : la scène vient de la référence du modèle, la
    // photo de l'utilisateur ne sert qu'à y placer son visage.
    let templateReferenceId = null;
    let effectivePrompt = prompt;
    let imageUrls;

    if (templateId) {
      const resolved = isBuiltinTemplateId(templateId)
        ? resolveBuiltinTemplateGeneration(templateId, {
            hasUserPhoto: uploadedUrls.length > 0,
          })
        : await resolveTemplateGeneration(supabase, templateId, {
            hasUserPhoto: uploadedUrls.length > 0,
          });

      if (!resolved.ok) {
        res.status(422).json({ code: resolved.code, message: resolved.message });
        return;
      }

      templateReferenceId = resolved.referenceId;
      effectivePrompt = resolved.prompt;
      // La photo de l'utilisateur d'abord : le modèle traite la première
      // référence comme le sujet à conserver.
      imageUrls = [...uploadedUrls, resolved.referenceUrl];
    } else {
      imageUrls = withShopifyTrophyReference(prompt, uploadedUrls);
    }

    if (imageUrls.length === 0) {
      res.status(422).json({
        code: "REFERENCE_IMAGE_REQUIRED",
        message: copy(
          uiLocale,
          "Une image de référence est requise.",
          "A reference image is required.",
        ),
      });
      return;
    }

    const finalPrompt = buildIdentityPreservingPrompt(effectivePrompt, {
      referenceImageCount: imageUrls.length,
    });
    const oneshotModelVariant = needsProModelVariant(effectivePrompt)
      ? "default"
      : "fast";
    const estimatedSeconds = estimateGenerationSeconds(effectivePrompt, {
      referenceImageCount: imageUrls.length,
      modelVariant: oneshotModelVariant,
    });

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
    const generationTemplateId = isBuiltinTemplateId(templateId)
      ? null
      : templateId;
    const { data: larp, error: insertErr } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        template_id: generationTemplateId,
        generation_type: "image",
        prompt: prompt,
        final_prompt: finalPrompt,
        provider: "oneshot",
        provider_task_id: pendingTaskId,
        status: "processing",
        aspect_ratio: aspectRatio,
        input_assets: imageUrls,
        credit_cost: creditCost,
        metadata: {
          oneshot_model_variant: oneshotModelVariant,
          estimated_seconds: estimatedSeconds,
          ...(templateReferenceId
            ? {
                ...(isBuiltinTemplateId(templateId)
                  ? { builtin_template_id: templateReferenceId }
                  : { selected_template_reference_image_id: templateReferenceId }),
              }
            : {}),
        },
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
            modelVariant: oneshotModelVariant,
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
              const retryPrompt = isFacialHairPrompt(finalPrompt)
                ? buildFacialHairHardRetryPrompt(finalPrompt)
                : buildLiteralRetryPrompt(finalPrompt);
              const referenceFileIds = await uploadImageUrlsToOneshot(imageUrls);
              const retryResponse = await createOneshotJob(retryPrompt, {
                aspectRatio,
                modelVariant: oneshotModelVariant,
                ...(referenceFileIds.length > 0 ? { referenceFileIds } : {}),
              });
              if (retryResponse && retryResponse.id) {
                await supabase
                  .from("generations")
                  .update({
                    final_prompt: retryPrompt,
                    metadata: {
                      oneshot_soft_retry: true,
                      oneshot_soft_retry_count: 1,
                    },
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
      estimatedSeconds,
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
