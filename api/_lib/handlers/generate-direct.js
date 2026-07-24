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
  recordGeneration,
} = require("../generation");
const { buildIdentityPreservingPrompt } = require("../prompt-guard");

function normalizeAspectRatio(value) {
  return value === "16:9" ? "16:9" : OUTPUT_ASPECT_RATIO;
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

    let finalPrompt = buildIdentityPreservingPrompt(prompt);
    let imageUrls = [];

    // Free-prompt path (Generate page): upload user images to R2.
    // Template-driven generations remain on the Express server when available.
    if (templateId && images.length === 0) {
      res.status(422).json({
        code: "REFERENCE_IMAGE_REQUIRED",
        message: "Une image de référence est requise.",
      });
      return;
    }
    imageUrls = await uploadInputImagesToR2(userId, images);

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
    let externalTaskId;
    let provider = "oneshot";

    const createWithKie = async () => {
      const kieResponse = await createKieTask({
        prompt: finalPrompt,
        aspect_ratio: aspectRatio,
        image_input: imageUrls,
      });
      if (kieResponse.code !== 200 || !kieResponse.data?.taskId) {
        return null;
      }
      return kieResponse.data.taskId;
    };

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
        if (isGoogleAiPromptFlagged(err)) {
          res.status(422).json({
            code: "PROMPT_POLICY_VIOLATION",
            message: "Prompt refusé par la politique de sécurité.",
          });
          return;
        }
        if (!kieReady) {
          console.error("OneshotAPI failed (no Kie fallback configured)", err);
          const detail =
            err && err.message ? String(err.message).slice(0, 240) : "erreur Oneshot";
          res.status(502).json({
            message: `Échec de la génération Oneshot (${detail})`,
          });
          return;
        }
        console.error("OneshotAPI failed, falling back to Kie AI", err);
        provider = "kie";
        const kieTaskId = await createWithKie();
        if (!kieTaskId) {
          res.status(502).json({ message: "Échec de création de la tâche" });
          return;
        }
        externalTaskId = kieTaskId;
      }
    } else if (kieReady) {
      provider = "kie";
      const kieTaskId = await createWithKie();
      if (!kieTaskId) {
        res.status(502).json({ message: "Échec de création de la tâche" });
        return;
      }
      externalTaskId = kieTaskId;
    } else {
      res.status(503).json({
        message:
          "Aucun fournisseur d'image configuré (ONESHOT_API_URL/KEY requis).",
      });
      return;
    }

    const { data: larp, error: insertErr } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        template_id: templateId,
        generation_type: "image",
        prompt: finalPrompt,
        final_prompt: finalPrompt,
        provider,
        provider_task_id: externalTaskId,
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
        provider,
        provider_task_id: externalTaskId,
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
