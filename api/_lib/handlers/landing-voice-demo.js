const fs = require("fs");
const path = require("path");
const { synthesizeSpeech } = require("../fish-audio");
const { uploadToR2, getR2Config } = require("../r2");
const { humanizeVoiceScript } = require("../voice-humanize");
const {
  buildLandingVoiceScript,
  landingVoiceR2Key,
  resolveLandingVoiceEntry,
  LANDING_VOICE_DEFAULT_SLUG,
} = require("../landing-voice-demo");

function readBundledLandingDemo(slug) {
  const fileName = `${slug}.mp3`;
  const candidates = [
    path.join(process.cwd(), "dist/public/assets/landing-voice-demos", fileName),
    path.join(process.cwd(), "client/public/assets/landing-voice-demos", fileName),
  ];
  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const buffer = fs.readFileSync(filePath);
      if (buffer.length >= 512) return buffer;
    } catch {
      /* try next path */
    }
  }
  return null;
}

async function getLandingDemoBuffer(entry, localeLike) {
  const cacheKey = landingVoiceR2Key(entry.slug, localeLike);
  const { publicUrl } = getR2Config();
  const cachedUrl = `${publicUrl.replace(/\/$/, "")}/${cacheKey}`;

  try {
    const cached = await fetch(cachedUrl);
    if (cached.ok) {
      const buffer = Buffer.from(await cached.arrayBuffer());
      if (buffer.length >= 512) {
        return { buffer, cached: true, cacheKey };
      }
    }
  } catch {
    /* cache miss */
  }

  const script = buildLandingVoiceScript(entry, localeLike);
  const { fishText } = humanizeVoiceScript(script, { voiceName: entry.name });
  const buffer = await synthesizeSpeech({
    text: fishText,
    referenceId: entry.fishId,
    format: "mp3",
    speed: entry.rate,
  });

  if (!buffer || buffer.length < 512) {
    throw Object.assign(new Error("Démo vocale landing indisponible."), {
      status: 502,
      code: "landing_demo_empty",
    });
  }

  await uploadToR2(cacheKey, buffer, "audio/mpeg");
  return { buffer, cached: false, cacheKey };
}

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
