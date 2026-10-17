const fs = require("fs");
const path = require("path");
const { synthesizeSpeech } = require("./fish-audio");
const { uploadToR2, getR2Config } = require("./r2");
const { humanizeVoiceScript } = require("./voice-humanize");
const {
  resolveCatalogPreviewTtsSpeed,
  resolveEffectiveCatalogFishId,
} = require("./voice-catalog");
const {
  buildLandingVoiceScript,
  landingVoiceR2Key,
  normalizeVoiceLocale,
} = require("./landing-voice-demo");

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

/**
 * Aperçu landing / clonage — MP3 bundle calibré d’abord (FR), puis cache R2, puis Fish + humanize.
 */
async function getLandingDemoBuffer(entry, localeLike) {
  const locale = normalizeVoiceLocale(localeLike);
  if (locale === "fr") {
    const bundled = readBundledLandingDemo(entry.slug);
    if (bundled) {
      return {
        buffer: bundled,
        cached: true,
        cacheKey: `bundled/landing-voice-demos/${entry.slug}.mp3`,
      };
    }
  }

  const cacheKey = landingVoiceR2Key(entry.slug, locale);
  try {
    const { publicUrl } = getR2Config();
    const cachedUrl = `${publicUrl.replace(/\/$/, "")}/${cacheKey}`;
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

  const script = buildLandingVoiceScript(entry, locale);
  const { fishText } = humanizeVoiceScript(script, { voiceName: entry.name });
  const fishId = resolveEffectiveCatalogFishId(entry);
  const speed = resolveCatalogPreviewTtsSpeed(fishId);

  const buffer = await synthesizeSpeech({
    text: fishText,
    referenceId: fishId,
    format: "mp3",
    speed: speed ?? undefined,
    cloneFidelity: false,
    catalogFastFlow: false,
  });

  if (!buffer || buffer.length < 512) {
    throw Object.assign(new Error("Démo vocale landing indisponible."), {
      status: 502,
      code: "landing_demo_empty",
    });
  }

  try {
    await uploadToR2(cacheKey, buffer, "audio/mpeg");
  } catch (err) {
    console.warn("[landing-voice-preview] R2 upload skipped", err?.message || err);
  }

  return { buffer, cached: false, cacheKey };
}

module.exports = {
  readBundledLandingDemo,
  getLandingDemoBuffer,
};
