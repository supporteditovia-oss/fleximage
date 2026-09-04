const { requireUser, sendError } = require("../user-auth");
const { loadVoiceGenerationManifest } = require("../voice-store");
const { getR2Config } = require("../r2");

module.exports = async function voiceDownloadHandler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const generationId =
      typeof req.query?.id === "string" ? req.query.id.trim() : "";
    if (!generationId) {
      res.status(400).json({ message: "id requis", code: "missing_id" });
      return;
    }

    const { supabase, userId } = await requireUser(req);
    let audioKey = `voice-generations/${userId}/${generationId}.mp3`;

    const { data: row, error } = await supabase
      .from("voice_generations")
      .select("audio_r2_key, user_id")
      .eq("id", generationId)
      .maybeSingle();

    const missingTable =
      error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        /voice_generations/i.test(String(error.message || "")));

    if (!error && row) {
      if (row.user_id !== userId) {
        res.status(403).json({ message: "Accès refusé", code: "forbidden" });
        return;
      }
      if (row.audio_r2_key) audioKey = row.audio_r2_key;
    } else if (!missingTable && error) {
      throw error;
    } else {
      const manifest = await loadVoiceGenerationManifest(userId, generationId);
      if (!manifest) {
        res.status(404).json({ message: "Audio introuvable", code: "not_found" });
        return;
      }
      if (manifest.user_id && manifest.user_id !== userId) {
        res.status(403).json({ message: "Accès refusé", code: "forbidden" });
        return;
      }
      audioKey =
        manifest.audio_r2_key ||
        manifest.audioR2Key ||
        `voice-generations/${userId}/${generationId}.mp3`;
    }

    const config = getR2Config();
    const sourceUrl = `${config.publicUrl.replace(/\/$/, "")}/${audioKey}`;
    const upstream = await fetch(sourceUrl, { signal: AbortSignal.timeout(20000) });
    if (!upstream.ok) {
      res.status(404).json({ message: "Audio introuvable", code: "not_found" });
      return;
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (!buffer.length) {
      res.status(404).json({ message: "Audio vide", code: "empty_audio" });
      return;
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="vocal-${generationId.slice(0, 8)}.mp3"`,
    );
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.status(200).send(buffer);
  } catch (error) {
    console.error("voice-download error", error);
    sendError(res, error);
  }
};
