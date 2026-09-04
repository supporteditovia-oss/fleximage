const { randomUUID } = require("crypto");
const { uploadToR2, getR2Config, listR2Objects } = require("./r2");

async function saveVoiceCloneManifest(userId, manifest) {
  const key = `voice-clones/${userId}/${manifest.id}.json`;
  const url = await uploadToR2(key, JSON.stringify(manifest), "application/json");
  return { key, url };
}

async function loadVoiceCloneManifest(userId, cloneId) {
  const config = getR2Config();
  const url = `${config.publicUrl.replace(/\/$/, "")}/voice-clones/${userId}/${cloneId}.json`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchVoiceSampleBuffer(sampleKey) {
  if (!sampleKey) return null;
  const config = getR2Config();
  const url = `${config.publicUrl.replace(/\/$/, "")}/${sampleKey}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.length > 0 ? buffer : null;
}

async function saveVoiceGenerationManifest(userId, manifest) {
  const key = `voice-generations/${userId}/${manifest.id}.json`;
  const url = await uploadToR2(key, JSON.stringify(manifest), "application/json");
  await upsertVoiceGenerationIndex(userId, manifest);
  return { key, url };
}

async function loadVoiceGenerationManifest(userId, generationId) {
  const config = getR2Config();
  const url = `${config.publicUrl.replace(/\/$/, "")}/voice-generations/${userId}/${generationId}.json`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function loadVoiceGenerationIndex(userId) {
  const config = getR2Config();
  const url = `${config.publicUrl.replace(/\/$/, "")}/voice-generations/${userId}/index.json`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) return [];
  try {
    const payload = await response.json();
    return Array.isArray(payload.items) ? payload.items : [];
  } catch {
    return [];
  }
}

async function saveVoiceGenerationIndex(userId, items) {
  const sorted = [...items].sort(
    (a, b) =>
      new Date(b.created_at || b.createdAt).getTime() -
      new Date(a.created_at || a.createdAt).getTime(),
  );
  const key = `voice-generations/${userId}/index.json`;
  await uploadToR2(
    key,
    JSON.stringify({ items: sorted.slice(0, 200) }),
    "application/json",
  );
}

async function upsertVoiceGenerationIndex(userId, manifest) {
  if (!manifest?.id) return;
  const items = await loadVoiceGenerationIndex(userId);
  const entry = {
    id: manifest.id,
    text: manifest.text,
    status: manifest.status || "succeeded",
    audio_url: manifest.audio_url || manifest.audioUrl || null,
    audio_r2_key: manifest.audio_r2_key || manifest.audioR2Key || null,
    voice_clone_id: manifest.voice_clone_id || manifest.voiceCloneId || null,
    credit_cost: manifest.credit_cost ?? manifest.creditCost ?? 0,
    created_at: manifest.created_at || manifest.createdAt || new Date().toISOString(),
    completed_at: manifest.completed_at || manifest.completedAt || null,
    metadata: manifest.metadata || {},
  };
  const next = [entry, ...items.filter((item) => item.id !== entry.id)];
  await saveVoiceGenerationIndex(userId, next);
}

/** Récupère les vocaux créés avant l’index (manifests + MP3 orphelins sur R2). */
async function discoverVoiceGenerationsFromR2(userId) {
  const prefix = `voice-generations/${userId}/`;
  const config = getR2Config();
  const base = config.publicUrl.replace(/\/$/, "");
  const objects = await listR2Objects(prefix, 400);
  const byId = new Map();

  const manifestKeys = objects
    .map((obj) => obj.key)
    .filter((key) => key.endsWith(".json") && !key.endsWith("/index.json"));

  await Promise.all(
    manifestKeys.map(async (key) => {
      try {
        const response = await fetch(`${base}/${key}`, {
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) return;
        const manifest = await response.json();
        if (!manifest?.id) return;
        if (manifest.status && manifest.status !== "succeeded") return;
        const audioUrl =
          manifest.audio_url ||
          manifest.audioUrl ||
          (manifest.audio_r2_key
            ? `${base}/${manifest.audio_r2_key}`
            : `${base}/voice-generations/${userId}/${manifest.id}.mp3`);
        byId.set(manifest.id, {
          ...manifest,
          audio_url: audioUrl,
        });
      } catch {
        /* ignore broken manifest */
      }
    }),
  );

  for (const obj of objects) {
    if (!obj.key.endsWith(".mp3")) continue;
    const fileName = obj.key.split("/").pop() || "";
    const id = fileName.replace(/\.mp3$/i, "");
    if (!id || byId.has(id)) continue;
    byId.set(id, {
      id,
      status: "succeeded",
      text: "Vocal généré",
      audio_url: `${base}/${obj.key}`,
      audio_r2_key: obj.key,
      created_at: obj.lastModified
        ? new Date(obj.lastModified).toISOString()
        : new Date().toISOString(),
      metadata: { recovered: true },
    });
  }

  return Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.created_at || b.createdAt).getTime() -
      new Date(a.created_at || a.createdAt).getTime(),
  );
}

async function rebuildVoiceGenerationIndex(userId) {
  const discovered = await discoverVoiceGenerationsFromR2(userId);
  if (discovered.length === 0) return [];
  await saveVoiceGenerationIndex(userId, discovered);
  return discovered;
}

function buildCloneRecord({
  userId,
  name,
  fishReferenceId,
  fishState,
  sourceType,
  sourceLabel,
  durationSec,
  sampleKey,
  sampleUrl,
  referenceTranscript,
}) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  return {
    id,
    user_id: userId,
    name,
    fish_reference_id: fishReferenceId,
    fish_state: fishState,
    source_type: sourceType,
    source_label: sourceLabel,
    duration_sec: durationSec,
    sample_r2_key: sampleKey,
    metadata: {
      sample_url: sampleUrl,
      reference_transcript: referenceTranscript || null,
    },
    created_at: createdAt,
  };
}

module.exports = {
  saveVoiceCloneManifest,
  loadVoiceCloneManifest,
  saveVoiceGenerationManifest,
  loadVoiceGenerationManifest,
  loadVoiceGenerationIndex,
  saveVoiceGenerationIndex,
  upsertVoiceGenerationIndex,
  discoverVoiceGenerationsFromR2,
  rebuildVoiceGenerationIndex,
  buildCloneRecord,
  fetchVoiceSampleBuffer,
};
