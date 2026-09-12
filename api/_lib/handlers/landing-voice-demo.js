const { synthesizeSpeech } = require("../fish-audio");
const { uploadToR2, getR2Config } = require("../r2");
const {
  buildLandingVoiceScript,
  landingVoiceR2Key,
  resolveLandingVoiceRapper,
  LANDING_VOICE_DEFAULT_SLUG,
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

  const rapper = resolveLandingVoiceRapper(req.query?.slug || LANDING_VOICE_DEFAULT_SLUG);
  if (!rapper) {
    res.status(400).json({
      code: "invalid_slug",
      message: "Voix landing inconnue.",
    });
    return;
  }

  try {
    const cacheKey = landingVoiceR2Key(rapper.slug);
    const { publicUrl } = getR2Config();
    const cachedUrl = `${publicUrl.replace(/\/$/, "")}/${cacheKey}`;

    try {
      const head = await fetch(cachedUrl, { method: "HEAD" });
      if (head.ok) {
        res.status(200).json({
          audioUrl: cachedUrl,
          cached: true,
          slug: rapper.slug,
          name: rapper.name,
        });
        return;
      }
    } catch {
      /* cache miss */
    }

    const buffer = await synthesizeSpeech({
      text: buildLandingVoiceScript(rapper.name),
      referenceId: rapper.fishId,
      format: "mp3",
    });

    if (!buffer || buffer.length < 512) {
      res.status(502).json({
        code: "landing_demo_empty",
        message: "Démo vocale landing indisponible.",
      });
      return;
    }

    const audioUrl = await uploadToR2(cacheKey, buffer, "audio/mpeg");
    res.status(200).json({
      audioUrl,
      cached: false,
      slug: rapper.slug,
      name: rapper.name,
    });
  } catch (error) {
    console.error("[landing-voice-demo]", error);
    res.status(error.status || 502).json({
      code: error.code || "landing_demo_failed",
      message: error.message || "Démo vocale landing indisponible.",
    });
  }
};
