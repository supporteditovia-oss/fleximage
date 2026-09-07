const { requireUser, readBody } = require("../user-auth");
const {
  analyzeSubjectContext,
  buildAnalysisSummaryFr,
  heuristicAnalysis,
} = require("../subject-analysis");

/** Aperçu client (facultatif) — même logique d'analyse que la génération. */
module.exports = async function analyzeSubjectHandler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    await requireUser(req);
    const body = readBody(req);
    const images = Array.isArray(body.images) ? body.images : [];
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const sceneContext =
      typeof body.scene_context === "string" ? body.scene_context.trim() : "";

    const firstImage = images[0];
    if (!firstImage || typeof firstImage !== "string") {
      const analysis = heuristicAnalysis(prompt, sceneContext);
      res.status(200).json({
        analysis,
        summaryFr: buildAnalysisSummaryFr(analysis),
      });
      return;
    }

    const analysis = await analyzeSubjectContext({
      imageBase64: firstImage,
      userPrompt: prompt,
      sceneContext,
    });

    res.status(200).json({
      analysis,
      summaryFr: buildAnalysisSummaryFr(analysis),
    });
  } catch (error) {
    console.error("[analyze-subject]", error);
    res.status(500).json({
      message: error?.message || "Analyse impossible.",
    });
  }
};
