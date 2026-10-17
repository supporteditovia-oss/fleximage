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

async function purgeGenerationR2Assets(userId, generationId, manifest) {
  const audioKey =
    manifest?.audio_r2_key ||
    manifest?.audioR2Key ||
    `voice-generations/${userId}/${generationId}.mp3`;
  const manifestKey = `voice-generations/${userId}/${generationId}.json`;
  await Promise.allSettled([deleteFromR2(audioKey), deleteFromR2(manifestKey)]);
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

    const { data: rows } = await supabase
      .from("voice_generations")
      .select("id, audio_r2_key")
      .eq("user_id", userId)
      .in("id", uniqueIds);

    const rowById = new Map((rows || []).map((row) => [row.id, row]));

    await Promise.all(
      uniqueIds.map(async (id) => {
        const row = rowById.get(id);
        if (row?.audio_r2_key) {
          await deleteFromR2(row.audio_r2_key).catch(() => undefined);
        }
        const manifest = await loadVoiceGenerationManifest(userId, id);
        await purgeGenerationR2Assets(userId, id, manifest);
      }),
    );

    await supabase
      .from("voice_generations")
      .delete()
      .eq("user_id", userId)
      .in("id", uniqueIds);

    const items = await loadVoiceGenerationIndex(userId);
    const idSet = new Set(uniqueIds);
    await saveVoiceGenerationIndex(
      userId,
      items.filter((item) => !idSet.has(item.id)),
    );

    res.status(200).json({ success: true, deleted: uniqueIds });
  } catch (error) {
    console.error("voice-delete error", error);
    sendError(res, error);
  }
};
