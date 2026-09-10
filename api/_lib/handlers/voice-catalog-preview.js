const { synthesizeSpeech } = require("../fish-audio");
const { uploadToR2, getR2Config } = require("../r2");
const {
  CATALOG_SAMPLE_LINE,
  isValidFishReferenceId,
  unifiedPreviewCacheKey,
} = require("../voice-catalog");

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
  if (!isValidFishReferenceId(fishReferenceId)) {
    res.status(400).json({
      code: "invalid_fish_id",
      message: "Identifiant voix catalogue invalide.",
    });
    return;
  }

  try {
    const cacheKey = unifiedPreviewCacheKey(fishReferenceId);
    const { publicUrl } = getR2Config();
    const cachedUrl = `${publicUrl.replace(/\/$/, "")}/${cacheKey}`;

    try {
      const head = await fetch(cachedUrl, { method: "HEAD" });
      if (head.ok) {
        res.status(200).json({ audioUrl: cachedUrl, cached: true });
        return;
      }
    } catch {
      /* cache miss — synthèse Fish */
    }

    const buffer = await synthesizeSpeech({
      text: CATALOG_SAMPLE_LINE,
      referenceId: fishReferenceId,
      format: "mp3",
    });

    if (!buffer || buffer.length < 512) {
      res.status(502).json({
        code: "preview_empty",
        message: "Aperçu vocal vide. Réessaie dans un instant.",
      });
      return;
    }

    const audioUrl = await uploadToR2(cacheKey, buffer, "audio/mpeg");
    res.status(200).json({ audioUrl, cached: false });
  } catch (error) {
    console.error("[voice-catalog-preview]", error);
    res.status(error.status || 502).json({
      code: error.code || "preview_failed",
      message: error.message || "Aperçu catalogue indisponible.",
    });
  }
};
