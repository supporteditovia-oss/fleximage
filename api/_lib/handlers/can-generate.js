const { requireUser, sendError } = require("../user-auth");
const {
  IMAGE_CREDIT_COST,
  checkGenerationLimits,
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
    const limitResult = await checkGenerationLimits(supabase, userId);
    res.status(200).json({
      canGenerate: limitResult.allowed,
      reason: limitResult.reason || null,
      isSubscriber: limitResult.isSubscriber,
      isAdmin: limitResult.isAdmin,
      creditCost: IMAGE_CREDIT_COST,
      generationCount: limitResult.generationCount || 0,
    });
  } catch (error) {
    console.error("can-generate error", error);
    sendError(res, error);
  }
};
