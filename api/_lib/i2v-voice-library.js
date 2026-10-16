const {
  findI2VLibraryEntryById,
  listActiveI2VLibraryEntries,
  listAllI2VLibraryEntries,
  resolveDefaultI2VLibraryVoiceId,
  resolveI2VLibraryFishId,
  normalizeGender,
} = require("../../shared/i2v-voice-library.cjs");
const { clampTtsSpeed, isValidFishReferenceId } = require("./voice-catalog");

const CLONE_PREFIX = "clone:";

function parseI2VVoiceId(raw) {
  const id = String(raw || "").trim();
  if (!id) return { kind: "none", id: "" };
  if (id.startsWith(CLONE_PREFIX)) {
    return { kind: "clone", id: id.slice(CLONE_PREFIX.length).trim() };
  }
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    return { kind: "clone", id };
  }
  return { kind: "library", id };
}

function toPublicLibraryDto(entry) {
  if (!entry) return null;
  return {
    id: entry.id,
    name: entry.name,
    gender: entry.gender,
    ageBand: entry.ageBand,
    styleFr: entry.styleFr,
    previewPath: entry.previewPath || null,
    commercialUseOk: entry.commercialUseOk !== false,
  };
}

function resolveI2VTtsSpeed(fishReferenceId, libraryEntryId) {
  const byId = libraryEntryId
    ? findI2VLibraryEntryById(libraryEntryId)
    : null;
  const entry =
    byId ||
    listAllI2VLibraryEntries().find(
      (e) =>
        String(e.fishId || "").toLowerCase() ===
        String(fishReferenceId || "").toLowerCase(),
    );
  if (entry && typeof entry.ttsSpeed === "number" && Number.isFinite(entry.ttsSpeed)) {
    return clampTtsSpeed(entry.ttsSpeed);
  }
  return null;
}

/**
 * Résout i2v_voice_id → fish + métadonnées pour generate-video / TTS.
 * @returns {Promise<{ i2vVoiceId: string, voiceMode: 'catalog'|'cloned', voiceCloneId: string|null, fishReferenceId: string, label: string, libraryEntryId: string|null }>}
 */
async function resolveI2VVoiceForGeneration(supabase, userId, body) {
  const parsed = parseI2VVoiceId(body?.i2v_voice_id);
  let voiceCloneId =
    typeof body?.voice_clone_id === "string" ? body.voice_clone_id.trim() : "";

  if (parsed.kind === "clone" && parsed.id) {
    voiceCloneId = parsed.id;
  }

  if (voiceCloneId || body?.voice_mode === "cloned") {
    const cloneId = voiceCloneId || String(body?.voice_clone_id || "").trim();
    if (!cloneId) {
      throw Object.assign(new Error("Voix clonée requise."), {
        status: 422,
        code: "I2V_VOICE_REQUIRED",
      });
    }
    const { data: clone, error } = await supabase
      .from("voice_clones")
      .select("id, user_id, name, fish_reference_id")
      .eq("id", cloneId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!clone?.fish_reference_id) {
      throw Object.assign(new Error("Voix clonée introuvable."), {
        status: 403,
        code: "VOICE_NOT_AUTHORIZED",
      });
    }
    const fish = String(clone.fish_reference_id).trim();
    if (!isValidFishReferenceId(fish)) {
      throw Object.assign(new Error("Clone vocal invalide."), {
        status: 502,
        code: "INVALID_CLONE_FISH_ID",
      });
    }
    const i2vVoiceId = `${CLONE_PREFIX}${clone.id}`;
    return {
      i2vVoiceId,
      voiceMode: "cloned",
      voiceCloneId: clone.id,
      fishReferenceId: fish,
      label: clone.name || "Ma voix",
      libraryEntryId: null,
    };
  }

  const libraryId =
    parsed.kind === "library" && parsed.id
      ? parsed.id
      : String(body?.i2v_voice_id || "").trim() ||
        resolveDefaultI2VLibraryVoiceId();

  const entry = findI2VLibraryEntryById(libraryId);
  if (!entry || entry.active !== true) {
    throw Object.assign(new Error("Voix catalogue I2V invalide ou inactive."), {
      status: 422,
      code: "I2V_VOICE_INVALID",
    });
  }
  const fishReferenceId = resolveI2VLibraryFishId(entry);
  if (!fishReferenceId) {
    throw Object.assign(new Error("Modèle Fish manquant pour cette voix."), {
      status: 502,
      code: "I2V_VOICE_MISCONFIGURED",
    });
  }

  return {
    i2vVoiceId: entry.id,
    voiceMode: "catalog",
    voiceCloneId: null,
    fishReferenceId,
    label: entry.styleFr || entry.name,
    libraryEntryId: entry.id,
  };
}

async function listUserVoiceClonesForI2V(supabase, userId) {
  const { data, error } = await supabase
    .from("voice_clones")
    .select("id, name, fish_reference_id, duration_sec, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    const missing =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /voice_clones/i.test(String(error.message || ""));
    if (missing) return [];
    throw error;
  }
  return (data || []).map((row) => ({
    id: row.id,
    i2vVoiceId: `${CLONE_PREFIX}${row.id}`,
    name: row.name || "Ma voix",
    kind: "clone",
    gender: null,
    styleFr: "Voix clonée",
    previewPath: null,
    durationSec: row.duration_sec,
    createdAt: row.created_at,
  }));
}

module.exports = {
  CLONE_PREFIX,
  parseI2VVoiceId,
  toPublicLibraryDto,
  listActiveI2VLibraryEntries,
  listAllI2VLibraryEntries,
  resolveDefaultI2VLibraryVoiceId,
  resolveI2VTtsSpeed,
  resolveI2VVoiceForGeneration,
  listUserVoiceClonesForI2V,
  normalizeGender,
};
