const { getR2Config } = require("../r2");
const {
  landingVoiceR2Key,
  resolveLandingVoiceEntry,
  LANDING_VOICE_DEFAULT_SLUG,
} = require("../landing-voice-demo");
const {
  getLandingDemoBuffer,
  readBundledLandingDemo,
} = require("../landing-voice-preview-buffer");

module.exports = async function landingVoiceDemoHandler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const entry = resolveLandingVoiceEntry(req.query?.slug || LANDING_VOICE_DEFAULT_SLUG);
  const locale = req.query?.lang || req.query?.locale || "fr";
  if (!entry) {
    res.status(400).json({
      code: "invalid_slug",
      message: "Voix landing inconnue.",
    });
    return;
  }

  const streamMedia =
    req.query?.media === "1" ||
    req.query?.stream === "1" ||
    String(req.headers.accept || "").includes("audio/");

  try {
    const { buffer, cached } = await getLandingDemoBuffer(entry, locale);

    if (streamMedia) {
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "public, max-age=86400, immutable");
      res.status(200).send(buffer);
      return;
    }

    const { publicUrl } = getR2Config();
    const audioUrl = `${publicUrl.replace(/\/$/, "")}/${landingVoiceR2Key(entry.slug, locale)}`;
    res.status(200).json({
      audioUrl,
      cached,
      slug: entry.slug,
      name: entry.name,
    });
  } catch (error) {
    const fallback = readBundledLandingDemo(entry.slug);
    if (fallback && streamMedia) {
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "public, max-age=86400, immutable");
      res.status(200).send(fallback);
      return;
    }
    console.error("[landing-voice-demo]", error);
    res.status(error.status || 502).json({
      code: error.code || "landing_demo_failed",
      message: error.message || "Démo vocale landing indisponible.",
    });
  }
};
