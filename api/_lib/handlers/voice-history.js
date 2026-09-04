const { requireUser, sendError } = require("../user-auth");
const {
  loadVoiceGenerationIndex,
  discoverVoiceGenerationsFromR2,
  saveVoiceGenerationIndex,
} = require("../voice-store");

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;

function toDto(row) {
  const cloneName =
    row.voice_clones?.name ||
    row.metadata?.voice_name ||
    row.metadata?.voiceName ||
    null;

  return {
    id: row.id,
    text: row.text,
    status: row.status,
    audioUrl: row.audio_url || row.audioUrl || null,
    voiceName: cloneName,
    creditCost: Number(row.credit_cost ?? row.creditCost ?? 0),
    createdAt: row.created_at || row.createdAt,
    completedAt: row.completed_at || row.completedAt || null,
  };
}

function parsePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

module.exports = async function voiceHistoryHandler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const { supabase, userId } = await requireUser(req);
    const limit = Math.min(
      Math.max(parsePositiveInt(req.query?.limit, DEFAULT_LIMIT), 1),
      MAX_LIMIT,
    );

    let dbItems = [];
    const { data, error } = await supabase
      .from("voice_generations")
      .select(
        "id, text, status, audio_url, credit_cost, created_at, completed_at, metadata, voice_clone_id, voice_clones(name)",
      )
      .eq("user_id", userId)
      .eq("status", "succeeded")
      .not("audio_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    const missingTable =
      error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        /voice_generations/i.test(String(error.message || "")));

    if (!error && data) {
      dbItems = data;
    } else if (!missingTable && error) {
      throw error;
    }

    const indexItems = await loadVoiceGenerationIndex(userId);
    const discoveredItems = await discoverVoiceGenerationsFromR2(userId);

    if (discoveredItems.length > 0) {
      const knownIds = new Set([
        ...dbItems.map((row) => row.id),
        ...indexItems.map((row) => row.id),
      ]);
      const hasNew = discoveredItems.some((row) => row?.id && !knownIds.has(row.id));
      if (hasNew || indexItems.length === 0) {
        const mergedIndex = new Map();
        for (const row of [...discoveredItems, ...indexItems, ...dbItems]) {
          if (!row?.id) continue;
          mergedIndex.set(row.id, {
            id: row.id,
            text: row.text,
            status: row.status || "succeeded",
            audio_url: row.audio_url || row.audioUrl,
            audio_r2_key: row.audio_r2_key || row.audioR2Key,
            voice_clone_id: row.voice_clone_id || row.voiceCloneId,
            credit_cost: row.credit_cost ?? row.creditCost ?? 0,
            created_at: row.created_at || row.createdAt,
            completed_at: row.completed_at || row.completedAt,
            metadata: row.metadata || {},
          });
        }
        await saveVoiceGenerationIndex(userId, Array.from(mergedIndex.values()));
      }
    }

    const merged = new Map();

    for (const row of dbItems) {
      merged.set(row.id, toDto(row));
    }
    for (const row of [...indexItems, ...discoveredItems]) {
      if (!row?.id || merged.has(row.id)) continue;
      if (row.status && row.status !== "succeeded") continue;
      if (!row.audio_url && !row.audioUrl) continue;
      merged.set(row.id, toDto(row));
    }

    const items = Array.from(merged.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    res.status(200).json({ items, total: items.length });
  } catch (error) {
    console.error("voice-history error", error);
    sendError(res, error);
  }
};
