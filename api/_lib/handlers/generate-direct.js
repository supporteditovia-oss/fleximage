const { requireUser, readBody, sendError } = require("../user-auth");
const { isUserAdmin } = require("../admin-access");
const { uploadInputImagesToR2 } = require("../r2");
const {
  getOneshotApiConfig,
  isGoogleAiPromptFlagged,
  ONESHOT_MODEL_VARIANT,
} = require("../oneshot");
const { generateImageOnce } = require("../generate-image-once");
const {
  normalizeGenerationRequestId,
  buildIdempotentGenerateResponse,
  claimGenerationRequest,
  conflictResponse,
  findGenerationByRequestId,
} = require("../generation-idempotency");
const {
  OUTPUT_ASPECT_RATIO,
  checkGenerationLimits,
  getBillableCreditCost,
  deductGenerationCredits,
  refundGenerationCreditsIfCharged,
  recordGeneration,
  translateLimitReason,
} = require("../generation");
const { buildSubjectPosePromptBlock, parseSubjectPoseFromBody } = require("../subject-pose-prompt");
const { analyzeSubjectContext } = require("../subject-analysis");
const { buildIdentityPreservingPrompt, buildBuiltinTemplateFaceSwapPrompt, buildBuiltinTemplateFaceSwapWithOutfitPrompt, isShopifyTrophyPrompt, estimateGenerationSeconds } = require("../prompt-guard");
const { detectObjectReplacement } = require("../object-replacement-prompt");
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
const {
  findRecentInFlightGeneration,
  SESSION_BURST_WINDOW_MS,
} = require("../generation-dedup");

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

/** Prompt injecté par le catalogue outfits (preview admin). */
function isCatalogOutfitCatalogPrompt(promptText) {
  return /^Remplace ma tenue par l['']image 2\.?\s*/i.test(
    String(promptText || "").trim(),
  );
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
    const admin = await isUserAdmin(supabase, userId);
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

    if (!admin) {
      if (templateId && isBuiltinTemplateId(templateId)) {
        res.status(403).json({
          code: "ADMIN_PREVIEW_ONLY",
          message: copy(
            uiLocale,
            "Les modèles prêts sont réservés aux administrateurs.",
            "Ready-made models are admin-only preview features.",
          ),
        });
        return;
      }
      if (isCatalogOutfitCatalogPrompt(prompt) && images.length >= 2) {
        res.status(403).json({
          code: "ADMIN_PREVIEW_ONLY",
          message: copy(
            uiLocale,
            "Le catalogue outfits est réservé aux administrateurs.",
            "The outfit catalog is an admin-only preview feature.",
          ),
        });
        return;
      }
    }

    const generationRequestId = normalizeGenerationRequestId(
      body.generation_request_id,
    );
    if (!generationRequestId) {
      res.status(400).json({
        code: "REQUEST_ID_REQUIRED",
        message: copy(
          uiLocale,
          "Identifiant de requête manquant (generation_request_id UUID v4 requis).",
          "Missing request id (generation_request_id UUID v4 required).",
        ),
      });
      return;
    }

    const existingByRequestId = await findGenerationByRequestId(
      supabase,
      generationRequestId,
    );
    if (existingByRequestId) {
      if (existingByRequestId.status === "failed") {
        res.status(409).json({
          code: "GENERATION_ALREADY_FAILED",
          message: copy(
            uiLocale,
            "Cette génération a déjà échoué. Clique sur « Nouvelle génération » pour réessayer (nouvelle action payante).",
            "This generation already failed. Start a new generation to retry (new billable action).",
          ),
          generationRequestId,
        });
        return;
      }
      console.info("[generate-direct] idempotent replay — same request_id", {
        userId,
        generationRequestId,
        generationId: existingByRequestId.id,
      });
      res.status(409).json(
        conflictResponse(existingByRequestId, generationRequestId, {
          generationType: "image",
        }),
      );
      return;
    }

    const burstInFlight = await findRecentInFlightGeneration(
      supabase,
      userId,
      SESSION_BURST_WINDOW_MS,
    );
    if (burstInFlight) {
      const burstRequestId =
        burstInFlight.metadata &&
        typeof burstInFlight.metadata === "object"
          ? burstInFlight.metadata.generation_request_id
          : null;
      if (burstRequestId !== generationRequestId) {
        console.info("[generate-direct] 409 burst — concurrent generation", {
          userId,
          generationRequestId,
          existingRequestId: burstRequestId,
          existingId: burstInFlight.id,
        });
        res.status(409).json(
          conflictResponse(burstInFlight, generationRequestId, {
            generationType: "image",
          }),
        );
        return;
      }
    }

    const inFlight = await findRecentInFlightGeneration(supabase, userId);
    if (inFlight) {
      const inflightRequestId =
        inFlight.metadata && typeof inFlight.metadata === "object"
          ? inFlight.metadata.generation_request_id
          : null;
      if (inflightRequestId !== generationRequestId) {
        console.info("[generate-direct] 409 — generation already in flight", {
          userId,
          generationRequestId,
          existingRequestId: inflightRequestId,
          existingId: inFlight.id,
        });
        res.status(409).json(
          conflictResponse(inFlight, generationRequestId, {
            generationType: "image",
          }),
        );
        return;
      }
    }

    const oneshotConfig = getOneshotApiConfig();
    if (!oneshotConfig.url || !oneshotConfig.key) {
      res.status(503).json({
        message:
          "Aucun fournisseur d'image configuré (ONESHOT_API_URL/KEY requis).",
      });
      return;
    }
    const frontendTimestamp =
      typeof body.frontend_timestamp === "string"
        ? body.frontend_timestamp
        : null;
    const clickCount =
      typeof body.click_count === "number" && body.click_count > 0
        ? body.click_count
        : 1;
    const source =
      typeof body.source === "string" && body.source.trim()
        ? body.source.trim()
        : templateId
          ? "catalog"
          : "direct";

    const generationTemplateId = isBuiltinTemplateId(templateId)
      ? null
      : templateId;

    const claim = await claimGenerationRequest(supabase, {
      generationRequestId,
      userId,
      templateId: generationTemplateId,
      prompt,
      aspectRatio,
      creditCost,
      clickCount,
      frontendTimestamp,
      source,
    });

    if (claim.kind === "duplicate") {
      console.info("[generate-direct] 409 claim duplicate", {
        userId,
        generationRequestId: claim.generationRequestId,
        generationId: claim.generation.id,
      });
      res.status(409).json(
        conflictResponse(claim.generation, claim.generationRequestId, {
          generationType: "image",
        }),
      );
      return;
    }

    if (claim.kind === "failed") {
      res.status(409).json({
        code: "GENERATION_ALREADY_FAILED",
        message: copy(
          uiLocale,
          "Cette génération a déjà échoué. Clique sur « Nouvelle génération » pour réessayer (nouvelle action payante).",
          "This generation already failed. Start a new generation to retry (new billable action).",
        ),
        generationRequestId: claim.generationRequestId,
      });
      return;
    }

    let larp = claim.generation;

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

    let uploadedUrls;
    try {
      uploadedUrls = await uploadInputImagesToR2(userId, images);
    } catch (uploadErr) {
      console.error("generate-direct upload failed", uploadErr);
      await failAndRefund(supabase, {
        userId,
        generationId: larp.id,
        failMessage: "Échec upload des images",
        source: "upload_failed",
      });
      res.status(502).json({ message: "Échec upload des images" });
      return;
    }

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
        await failAndRefund(supabase, {
          userId,
          generationId: larp.id,
          failMessage: resolvedTemplate.message || "Modèle invalide",
          source: "template_resolve_failed",
        });
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
        await failAndRefund(supabase, {
          userId,
          generationId: larp.id,
          failMessage: "Image de référence requise",
          source: "reference_required",
        });
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
      await failAndRefund(supabase, {
        userId,
        generationId: larp.id,
        failMessage: "Image de référence requise",
        source: "reference_required",
      });
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

    const { subject, poseStyle } = parseSubjectPoseFromBody(body);

    const referenceImageUrl = imageUrls[0];
    const sceneContext = resolvedTemplate?.ok
      ? String(resolvedTemplate.prompt || effectivePrompt || "")
      : "";
    const subjectAnalysis = await analyzeSubjectContext({
      imageUrl: referenceImageUrl,
      userPrompt: effectivePrompt,
      sceneContext,
    });

    const subjectPoseBlock = buildSubjectPosePromptBlock({
      subject,
      poseStyle,
      analysis: subjectAnalysis,
      userPrompt: effectivePrompt,
      sceneContext,
      faceSwapLockedPose: isBuiltinFaceSwap,
    });

    const finalPrompt = isBuiltinFaceSwapWithOutfit
      ? buildBuiltinTemplateFaceSwapWithOutfitPrompt(
          "Remplace uniquement la personne de l'image 3 par la personne de l'image 1. Remplace ma tenue par l'image 2. Garde le décor, la pose et l'éclairage de l'image 3 identiques.",
          { subjectPoseBlock },
        )
      : isBuiltinFaceSwap
        ? buildBuiltinTemplateFaceSwapPrompt(effectivePrompt, {
            subjectPoseBlock,
          })
        : buildIdentityPreservingPrompt(effectivePrompt, {
            referenceImageCount: imageUrls.length,
            subjectPoseBlock,
            subjectAnalysis,
          });
    const oneshotModelVariant = ONESHOT_MODEL_VARIANT;
    const estimatedSeconds = estimateGenerationSeconds(effectivePrompt, {
      referenceImageCount: imageUrls.length,
      modelVariant: oneshotModelVariant,
    });

    const prevMeta =
      larp.metadata && typeof larp.metadata === "object" ? larp.metadata : {};
    const objectReplacementIntent = detectObjectReplacement(effectivePrompt, {
      referenceImageCount: imageUrls.length,
      subjectAnalysis,
    });

    const generationMetadata = {
      ...prevMeta,
      oneshot_model_variant: oneshotModelVariant,
      estimated_seconds: estimatedSeconds,
      subject_analysis: subjectAnalysis,
      subject_type: subject,
      pose_style: poseStyle,
      object_replacement_mode: objectReplacementIntent
        ? objectReplacementIntent.kind
        : null,
      server_prompt_ready_at: new Date().toISOString(),
      ...(templateReferenceId
        ? {
            ...(isBuiltinTemplateId(templateId)
              ? { builtin_template_id: templateReferenceId }
              : { selected_template_reference_image_id: templateReferenceId }),
          }
        : {}),
    };

    await supabase
      .from("generations")
      .update({
        final_prompt: finalPrompt,
        input_assets: imageUrls,
        metadata: generationMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", larp.id);

    let providerResult;
    try {
      providerResult = await generateImageOnce(supabase, {
        generationId: larp.id,
        finalPrompt,
        aspectRatio,
        imageUrls,
        modelVariant: oneshotModelVariant,
        logContext: {
          userId,
          source,
          generationRequestId: claim.generationRequestId,
          clickCount,
        },
      });
    } catch (providerErr) {
      console.error("[generate-direct] generateImageOnce failed", providerErr);
      const detail =
        providerErr && providerErr.message
          ? String(providerErr.message).slice(0, 240)
          : "erreur Oneshot";
      const failMessage = isGoogleAiPromptFlagged(providerErr)
        ? "Échec provider (filtre). Reformule ta demande — jetons remboursés."
        : `Échec de la génération (${detail}). Jetons remboursés.`;
      await failAndRefund(supabase, {
        userId,
        generationId: larp.id,
        failMessage,
        source: "oneshot_create_failed",
      });
      res.status(502).json({
        message: failMessage,
        generationRequestId: claim.generationRequestId,
      });
      return;
    }

    const externalTaskId = providerResult.externalTaskId;
    if (!externalTaskId) {
      await failAndRefund(supabase, {
        userId,
        generationId: larp.id,
        failMessage: "Échec de création de la tâche",
        source: "provider_missing_task_id",
      });
      res.status(502).json({ message: "Échec de création de la tâche" });
      return;
    }

    res.status(201).json({
      id: larp.id,
      taskId: externalTaskId,
      status: "waiting",
      isSubscriber: limitResult.isSubscriber,
      estimatedSeconds,
      createdAt: larp.created_at,
      generationRequestId: claim.generationRequestId,
      deduplicated: Boolean(providerResult.deduplicated),
      apiCallCount: providerResult.apiCallCount,
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
