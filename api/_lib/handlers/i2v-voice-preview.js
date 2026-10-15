const { sendError } = require("../user-auth");
const {
  resolveI2VAdminStudioAccess,
  assertI2VAdminStudio,
} = require("../i2v-admin-studio");
const { synthesizeSpeech } = require("../fish-audio");
const { uploadToR2, getR2Config } = require("../r2");
const {
  findI2VLibraryEntryById,
  parseI2VVoiceId,
  resolveI2VTtsSpeed,
} = require("../i2v-voice-library");
const { I2V_VOICE_PREVIEW_PHRASE_FR } = require("../../../shared/i2v-voice-test-phrase.cjs");

const PREVIEW_VERSION = 1;

function previewCacheKey(voiceKey) {
  return `i2v-voice-library/preview/v${PREVIEW_VERSION}/${String(voiceKey).toLowerCase()}.mp3`;
}

module.exports = async function i2vVoicePreviewHandler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const rawId = String(req.query?.id || req.query?.voice_id || "").trim();
  if (!rawId) {
    res.status(400).json({ code: "missing_voice_id", message: "Voix requise." });
    return;
  }

  try {
    const { supabase, userId, isAdmin } = await resolveI2VAdminStudioAccess(req);
    assertI2VAdminStudio(isAdmin);
    const parsed = parseI2VVoiceId(rawId);
    let fishId = null;
    let libraryEntryId = null;
    let cloneFidelity = false;
    let cacheKey = previewCacheKey(rawId);

    if (parsed.kind === "clone") {
      const { data: clone } = await supabase
        .from("voice_clones")
        .select("id, fish_reference_id")
        .eq("id", parsed.id)
        .eq("user_id", userId)
        .maybeSingle();
      fishId = clone?.fish_reference_id || null;
      cloneFidelity = true;
      cacheKey = previewCacheKey(`clone-${parsed.id}`);
    } else {
      const entry = findI2VLibraryEntryById(parsed.id);
      if (!entry) {
        res.status(404).json({ code: "voice_not_found", message: "Voix introuvable." });
        return;
      }
      fishId = entry.fishId;
      libraryEntryId = entry.id;
      cacheKey = previewCacheKey(entry.id);
    }

    if (!fishId) {
      res.status(404).json({ code: "voice_not_found", message: "Voix introuvable." });
      return;
    }

    const { publicUrl } = getR2Config();
    const cachedUrl = `${publicUrl.replace(/\/$/, "")}/${cacheKey}`;
    try {
      const head = await fetch(cachedUrl, { method: "HEAD" });
      if (head.ok) {
        res.status(200).json({ audioUrl: cachedUrl, cached: true });
        return;
      }
    } catch {
      /* synthèse */
    }

    const speed = resolveI2VTtsSpeed(fishId, libraryEntryId);
    const buffer = await synthesizeSpeech({
      text: I2V_VOICE_PREVIEW_PHRASE_FR,
      referenceId: fishId,
      format: "mp3",
      speed: speed ?? undefined,
      cloneFidelity,
    });

    if (!buffer || buffer.length < 512) {
      res.status(502).json({
        code: "preview_empty",
        message: "Aperçu vocal vide.",
      });
      return;
    }

    const audioUrl = await uploadToR2(cacheKey, buffer, "audio/mpeg");
    res.status(200).json({ audioUrl, cached: false });
  } catch (error) {
    console.error("[i2v-voice-preview]", error);
    sendError(res, error);
  }
};
