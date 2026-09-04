const { requireUser, readBody, sendError } = require("../user-auth");
const { deleteFromR2 } = require("../r2");
const {
  loadVoiceGenerationIndex,
  saveVoiceGenerationIndex,
  loadVoiceGenerationManifest,
} = require("../voice-store");

function parseIds(req) {
  const body = readBody(req);
  if (Array.isArray(body.ids)) {
    return body.ids.map((id) => String(id).trim()).filter(Boolean);
  }
  if (typeof body.id === "string" && body.id.trim()) {
    return [body.id.trim()];
  }
  if (typeof req.query?.id === "string" && req.query.id.trim()) {
    return [req.query.id.trim()];
  }
  return [];
}

async function purgeVoiceGenerationAssets(userId, generationId, manifest) {
  const audioKey =
    manifest?.audio_r2_key ||
    manifest?.audioR2Key ||
    `voice-generations/${userId}/${generationId}.mp3`;
  const manifestKey = `voice-generations/${userId}/${generationId}.json`;

  await Promise.allSettled([deleteFromR2(audioKey), deleteFromR2(manifestKey)]);

  const items = await loadVoiceGenerationIndex(userId);
  const next = items.filter((item) => item.id !== generationId);
  await saveVoiceGenerationIndex(userId, next);
}

module.exports = async function voiceDeleteHandler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "DELETE" && req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const { supabase, userId } = await requireUser(req);
    const ids = parseIds(req);

    if (ids.length === 0) {
      res.status(400).json({ message: "id requis", code: "missing_id" });
      return;
    }

    const uniqueIds = [...new Set(ids)].slice(0, 50);
    const deleted = [];

    for (const id of uniqueIds) {
      const { data: rows, error } = await supabase
        .from("voice_generations")
        .select("id, audio_r2_key")
        .eq("id", id)
        .eq("user_id", userId)
        .limit(1);

      if (!error && rows?.length) {
        const row = rows[0];
        if (row.audio_r2_key) {
          await deleteFromR2(row.audio_r2_key).catch(() => undefined);
        }
        await supabase.from("voice_generations").delete().eq("id", id).eq("user_id", userId);
      }

      const manifest = await loadVoiceGenerationManifest(userId, id);
      await purgeVoiceGenerationAssets(userId, id, manifest);
      deleted.push(id);
    }

    res.status(200).json({ success: true, deleted });
  } catch (error) {
    console.error("voice-delete error", error);
    sendError(res, error);
  }
};
