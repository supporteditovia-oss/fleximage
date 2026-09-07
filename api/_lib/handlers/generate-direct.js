const { randomUUID } = require("crypto");
const { requireUser, readBody, sendError } = require("../user-auth");
const { uploadInputImagesToR2 } = require("../r2");
const {
  getOneshotApiConfig,
  getAppSettings,
  isGoogleAiPromptFlagged,
  uploadImageUrlsToOneshot,
  createOneshotJob,
  ONESHOT_MODEL_VARIANT,
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
const { buildIdentityPreservingPrompt, buildBuiltinTemplateFaceSwapPrompt, buildBuiltinTemplateFaceSwapWithOutfitPrompt, buildLiteralRetryPrompt, isShopifyTrophyPrompt, estimateGenerationSeconds } = require("../prompt-guard");
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

/** Block duplicate clicks — one in-flight image generation per user. */
const GENERATION_DEDUP_WINDOW_MS = 90_000;

function extractClientTaskId(providerTaskId) {
  const parts = String(providerTaskId || "")
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const last = parts[parts.length - 1] || "";
  // Keep full segment (e.g. custom_*) — status poll matches provider_task_id segments.
  return last;
}

async function findRecentInFlightGeneration(supabase, userId) {
  const since = new Date(Date.now() - GENERATION_DEDUP_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("generations")
    .select("id, provider_task_id, metadata, created_at")
    .eq("user_id", userId)
    .eq("generation_type", "image")
    .eq("status", "processing")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

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

    const inFlight = await findRecentInFlightGeneration(supabase, userId);
    if (inFlight) {
      const existingTaskId = extractClientTaskId(inFlight.provider_task_id);
      const meta =
        inFlight.metadata && typeof inFlight.metadata === "object"
          ? inFlight.metadata
          : {};
      res.status(200).json({
        id: inFlight.id,
        taskId: existingTaskId,
        status: "processing",
        estimatedSeconds:
          meta.estimated_seconds != null &&
          Number.isFinite(Number(meta.estimated_seconds))
            ? Number(meta.estimated_seconds)
            : null,
        deduplicated: true,
      });
      return;
    }

    const uploadedUrls = await uploadInputImagesToR2(userId, images);

    // Modèle prêt à l'emploi : la scène vient de la référence du modèle, la
    // photo de l'utilisateur ne sert qu'à y placer son visage.
    let templateReferenceId = null;
    let effectivePrompt = prompt;
    let imageUrls;
    let resolvedTemplate = null;

    if (templateId) {
      resolvedTemplate = isBuiltinTemplateId(templateId)
        ? resolveBuiltinTemplateGeneration(templateId, {
            hasUserPhoto: uploadedUrls.length > 0,
          })
        : await resolveTemplateGeneration(supabase, templateId, {
            hasUserPhoto: uploadedUrls.length > 0,
          });

      if (!resolvedTemplate.ok) {
        res.status(422).json({
          code: resolvedTemplate.code,
          message: resolvedTemplate.message,
        });
        return;
      }

      templateReferenceId = resolvedTemplate.referenceId;
      effectivePrompt = resolvedTemplate.prompt;
      const hasOutfitRef =
        resolvedTemplate.generationMode === "face-swap" &&
        uploadedUrls.length >= 2;
      // Ordre : sans outfit → (1) user, (2) scène ; avec outfit → (1) user, (2) tenue, (3) scène.
      imageUrls = hasOutfitRef
        ? [
            uploadedUrls[0],
            uploadedUrls[1],
            ...(resolvedTemplate.extraReferenceUrls || []),
            resolvedTemplate.referenceUrl,
          ]
        : [
            ...uploadedUrls,
            ...(resolvedTemplate.extraReferenceUrls || []),
            resolvedTemplate.referenceUrl,
          ];
    } else {
      if (images.length === 0) {
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

    const isBuiltinFaceSwap =
      resolvedTemplate?.ok &&
      resolvedTemplate.isBuiltin &&
      resolvedTemplate.generationMode === "face-swap";
    const isBuiltinFaceSwapWithOutfit =
      isBuiltinFaceSwap && uploadedUrls.length >= 2;

    const finalPrompt = isBuiltinFaceSwapWithOutfit
      ? buildBuiltinTemplateFaceSwapWithOutfitPrompt(
          "Remplace uniquement la personne de l'image 3 par la personne de l'image 1. Remplace ma tenue par l'image 2. Garde le décor, la pose et l'éclairage de l'image 3 identiques.",
        )
      : isBuiltinFaceSwap
        ? buildBuiltinTemplateFaceSwapPrompt(effectivePrompt)
        : buildIdentityPreservingPrompt(effectivePrompt, {
            referenceImageCount: imageUrls.length,
          });
    const oneshotModelVariant = ONESHOT_MODEL_VARIANT;
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
          // One OneShot job max — no 2nd createOneshotJob; Kie fallback or fail.
          if (isGoogleAiPromptFlagged(err)) {
            console.warn(
              "OneshotAPI flagged prompt — Kie fallback only (no 2nd OneShot job)",
              err && err.message ? err.message : err,
            );
          }
          if (!kieReady) {
            console.error("OneshotAPI failed (no Kie fallback configured)", err);
            const detail =
              err && err.message
                ? String(err.message).slice(0, 240)
                : "erreur Oneshot";
            const failMessage = isGoogleAiPromptFlagged(err)
              ? "Échec provider (filtre). Reformule ou configure KIE_AI_API_KEY. Jetons remboursés."
              : `Échec de la génération Oneshot (${detail})`;
            await failAndRefund(supabase, {
              userId,
              generationId: larp.id,
              failMessage,
              source: isGoogleAiPromptFlagged(err)
                ? "oneshot_policy_no_retry"
                : "oneshot_create_failed",
            });
            res.status(502).json({ message: failMessage });
            return;
          }
          console.error("OneshotAPI failed, falling back to Kie AI", err);
          provider = "kie";
          const kiePrompt = isGoogleAiPromptFlagged(err)
            ? buildLiteralRetryPrompt(finalPrompt)
            : finalPrompt;
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
          if (kiePrompt !== finalPrompt) {
            await supabase
              .from("generations")
              .update({
                final_prompt: kiePrompt,
                updated_at: new Date().toISOString(),
              })
              .eq("id", larp.id);
          }
          externalTaskId = kieTaskId;
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
