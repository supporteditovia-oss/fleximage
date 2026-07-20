const { requireUser, readBody, sendError } = require("../user-auth");
const { uploadInputImagesToR2 } = require("../r2");
const {
  getOneshotApiConfig,
  getAppSettings,
  isGoogleAiPromptFlagged,
  uploadImageUrlsToOneshot,
  createOneshotJob,
} = require("../oneshot");
const { createKieTask } = require("../kie");
const {
  OUTPUT_ASPECT_RATIO,
  checkGenerationLimits,
  getBillableCreditCost,
  deductGenerationCredits,
  recordGeneration,
} = require("../generation");

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

    let finalPrompt = prompt.replace(/tanas?|92i/gi, "jolies filles");
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
    let externalTaskId;
    let provider = "oneshot";

    if (!appSettings.forceKieAi && oneshotConfig.url && oneshotConfig.key) {
      try {
        const referenceFileIds = await uploadImageUrlsToOneshot(imageUrls);
        const oneshotResponse = await createOneshotJob(finalPrompt, {
          aspectRatio: OUTPUT_ASPECT_RATIO,
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
        console.error("OneshotAPI failed, falling back to Kie AI", err);
        provider = "kie";
        const kieResponse = await createKieTask({
          prompt: finalPrompt,
          aspect_ratio: OUTPUT_ASPECT_RATIO,
          image_input: imageUrls,
        });
        if (kieResponse.code !== 200 || !kieResponse.data?.taskId) {
          res.status(502).json({ message: "Échec de création de la tâche" });
          return;
        }
        externalTaskId = kieResponse.data.taskId;
      }
    } else {
      provider = "kie";
      const kieResponse = await createKieTask({
        prompt: finalPrompt,
        aspect_ratio: OUTPUT_ASPECT_RATIO,
        image_input: imageUrls,
      });
      if (kieResponse.code !== 200 || !kieResponse.data?.taskId) {
        res.status(502).json({ message: "Échec de création de la tâche" });
        return;
      }
      externalTaskId = kieResponse.data.taskId;
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
        aspect_ratio: OUTPUT_ASPECT_RATIO,
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
