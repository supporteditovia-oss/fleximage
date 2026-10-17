const { synthesizeSpeech } = require("../fish-audio");
const { uploadToR2, getR2Config } = require("../r2");
const {
  buildCatalogSampleLine,
  isValidFishReferenceId,
  lookupCatalogEntryByFishId,
  resolveCatalogTtsSpeed,
  unifiedPreviewCacheKey,
} = require("../voice-catalog");
const { buildLandingVoiceScript } = require("../../../shared/voice-locale-scripts.cjs");
const {
  findI2VLibraryEntryByFishId,
  resolveI2VPreviewPhrase,
} = require("../../../shared/i2v-voice-library.cjs");

function wantsStreamMedia(req) {
  return (
    req.query?.media === "1" ||
    req.query?.stream === "1" ||
    String(req.headers.accept || "").includes("audio/")
  );
}

function resolvePreviewText(_fishReferenceId, i2vEntry, catalogEntry, locale) {
  if (catalogEntry) {
    return buildLandingVoiceScript(
      { name: catalogEntry.name, demoKind: catalogEntry.demoKind },
      locale,
    );
  }
  if (i2vEntry) return resolveI2VPreviewPhrase(i2vEntry);
  return buildCatalogSampleLine("LuxeFlexIA", locale);
}

async function loadCachedPreviewBuffer(cacheKey) {
  let publicUrl;
  try {
    publicUrl = getR2Config().publicUrl;
  } catch {
    return null;
  }
  const cachedUrl = `${publicUrl.replace(/\/$/, "")}/${cacheKey}`;
  try {
    const cached = await fetch(cachedUrl);
    if (!cached.ok) return null;
    const buffer = Buffer.from(await cached.arrayBuffer());
    return buffer.length >= 512 ? buffer : null;
  } catch {
    return null;
  }
}

async function getCatalogPreviewBuffer(fishReferenceId, locale) {
  const fish = fishReferenceId.toLowerCase();
  const catalogEntry = lookupCatalogEntryByFishId(fish);
  const i2vEntry = findI2VLibraryEntryByFishId(fish);
  const cacheKey = catalogEntry
    ? unifiedPreviewCacheKey(fish, locale)
    : i2vEntry
      ? `voice-catalog/i2v/v4/${String(locale).toLowerCase()}/${fish}.mp3`
      : unifiedPreviewCacheKey(fish, locale);

  const cached = await loadCachedPreviewBuffer(cacheKey);
  if (cached) {
    return { buffer: cached, cached: true, cacheKey };
  }

  const previewText = resolvePreviewText(fish, i2vEntry, catalogEntry, locale);
  const ttsSpeed = resolveCatalogTtsSpeed(fish);

  const buffer = await synthesizeSpeech({
    text: previewText,
    referenceId: fish,
    format: "mp3",
    speed: ttsSpeed ?? undefined,
  });

  if (!buffer || buffer.length < 512) {
    throw Object.assign(new Error("Aperçu vocal vide. Réessaie dans un instant."), {
      status: 502,
      code: "preview_empty",
    });
  }

  try {
    await uploadToR2(cacheKey, buffer, "audio/mpeg");
  } catch (err) {
    console.warn("[voice-catalog-preview] R2 upload skipped", err?.message || err);
  }

  return { buffer, cached: false, cacheKey };
}

module.exports = async function voiceCatalogPreviewHandler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const fishReferenceId = String(req.query?.fish_id || req.query?.fishId || "").trim();
  const locale = req.query?.lang || req.query?.locale || "fr";
  if (!isValidFishReferenceId(fishReferenceId)) {
    res.status(400).json({
      code: "invalid_fish_id",
      message: "Identifiant voix catalogue invalide.",
    });
    return;
  }

  const fish = fishReferenceId.toLowerCase();
  const streamMedia = wantsStreamMedia(req);

  try {
    const { buffer, cached } = await getCatalogPreviewBuffer(fish, locale);

    if (streamMedia) {
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      res.setHeader("X-Voice-Preview-Cached", cached ? "1" : "0");
      res.setHeader("X-Voice-Fish-Id", fish);
      res.status(200).send(buffer);
      return;
    }

    const params = new URLSearchParams({
      fish_id: fish,
      lang: String(locale),
      media: "1",
    });
    res.status(200).json({
      audioUrl: `/api/larps/voice/catalog-preview?${params.toString()}`,
      cached,
      fishId: fish,
    });
  } catch (error) {
    console.error("[voice-catalog-preview]", error);
    if (streamMedia) {
      res.status(error.status || 502).end();
      return;
    }
    res.status(error.status || 502).json({
      code: error.code || "preview_failed",
      message: error.message || "Aperçu catalogue indisponible.",
    });
  }
};
