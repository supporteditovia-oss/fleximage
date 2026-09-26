const { requireUser, readBody, sendError } = require("../user-auth");
const {
  isDisallowedAdultPrompt,
  contentPolicyResponse,
} = require("../content-policy");
const { resolveRequestLocale } = require("../locale-copy");
const { enrichPromptForGeneration } = require("../prompt-intelligence");

/** POST /api/ai/prompt — Gemini 2.5 Flash prompt optimization (no image generation). */
module.exports = async function aiPromptHandler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    await requireUser(req);
    const body = readBody(req);
    const uiLocale = resolveRequestLocale(req, body);
    const input = typeof body.input === "string" ? body.input.trim() : "";

    if (!input || input.length > 2000) {
      res.status(400).json({
        message: "Invalid input (1-2000 characters)",
      });
      return;
    }

    if (isDisallowedAdultPrompt(input)) {
      contentPolicyResponse(res, uiLocale);
      return;
    }

    const mode =
      body.mode === "video_i2v" || body.mode === "video_v2v"
        ? body.mode
        : "image";
    const prompt = await enrichPromptForGeneration(input, {
      locale: uiLocale,
      mode,
      voiceEnabled: Boolean(body.voice_enabled),
    });
    res.status(200).json({ prompt, mode });
  } catch (error) {
    console.error("ai-prompt error", error);
    sendError(res, error);
  }
};
