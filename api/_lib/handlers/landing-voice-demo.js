const { synthesizeSpeech } = require("../fish-audio");
const { uploadToR2, getR2Config } = require("../r2");
const {
  LANDING_VOICE_DEMO_SCRIPT,
  LANDING_VOICE_GIMS_FISH_ID,
  LANDING_VOICE_DEMO_R2_KEY,
} = require("../landing-voice-demo");

module.exports = async function landingVoiceDemoHandler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const { publicUrl } = getR2Config();
    const cachedUrl = `${publicUrl.replace(/\/$/, "")}/${LANDING_VOICE_DEMO_R2_KEY}`;

    try {
      const head = await fetch(cachedUrl, { method: "HEAD" });
      if (head.ok) {
        res.status(200).json({ audioUrl: cachedUrl, cached: true });
        return;
      }
    } catch {
      /* cache miss */
    }

    const buffer = await synthesizeSpeech({
      text: LANDING_VOICE_DEMO_SCRIPT,
      referenceId: LANDING_VOICE_GIMS_FISH_ID,
      format: "mp3",
    });

    if (!buffer || buffer.length < 512) {
      res.status(502).json({
        code: "landing_demo_empty",
        message: "Démo vocale landing indisponible.",
      });
      return;
    }

    const audioUrl = await uploadToR2(
      LANDING_VOICE_DEMO_R2_KEY,
      buffer,
      "audio/mpeg",
    );
    res.status(200).json({ audioUrl, cached: false });
  } catch (error) {
    console.error("[landing-voice-demo]", error);
    res.status(error.status || 502).json({
      code: error.code || "landing_demo_failed",
      message: error.message || "Démo vocale landing indisponible.",
    });
  }
};
