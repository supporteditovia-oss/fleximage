const { getCrmSupabase } = require("./supabase");
const { logCrmActivity } = require("./activity");
const { isCrmSchemaMissingError } = require("./schema-errors");
const { uploadCrmMusicFile, removeStorageObject } = require("./storage");

async function listMusic(query) {
  const sb = getCrmSupabase();
  let q = sb.from("crm_music").select("*").order("created_at", { ascending: false });
  if (query.q) {
    q = q.or(`title.ilike.%${query.q}%,artist.ilike.%${query.q}%`);
  }
  if (query.favorite === "1") q = q.eq("is_favorite", true);
  const { data, error } = await q.limit(300);
  if (error) {
    if (isCrmSchemaMissingError(error)) return [];
    throw error;
  }
  return data;
}

async function uploadMusic(body) {
  const uploaded = await uploadCrmMusicFile(body);
  const sb = getCrmSupabase();
  const { data, error } = await sb
    .from("crm_music")
    .insert({
      title: body.title || body.fileName || "Sans titre",
      artist: body.artist || null,
      audio_url: uploaded.publicUrl,
      storage_path: uploaded.storagePath,
      duration_seconds: Number(body.duration_seconds) || 0,
      country_code: (body.country_code || "FR").toUpperCase().slice(0, 2),
      energy: body.energy || null,
      mood: body.mood || null,
      popularity: Number(body.popularity) || 0,
      is_favorite: !!body.is_favorite,
      source: "upload",
    })
    .select("*")
    .single();
  if (error) throw error;
  await logCrmActivity("music", `Musique importée — ${data.title}`, { id: data.id });
  return data;
}

async function createMusic(body) {
  if (body.dataBase64) {
    return uploadMusic(body);
  }
  if (!body.audio_url && !body.storage_path) {
    throw Object.assign(new Error("Fichier audio requis"), { status: 400 });
  }
  const sb = getCrmSupabase();
  const { data, error } = await sb
    .from("crm_music")
    .insert({
      title: body.title,
      artist: body.artist || null,
      audio_url: body.audio_url,
      storage_path: body.storage_path || null,
      duration_seconds: Number(body.duration_seconds) || 0,
      country_code: body.country_code || null,
      energy: body.energy || null,
      mood: body.mood || null,
      popularity: Number(body.popularity) || 0,
      is_favorite: !!body.is_favorite,
      source: body.source || "upload",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function updateMusic(id, body) {
  const sb = getCrmSupabase();
  const patch = {};
  for (const k of [
    "title",
    "artist",
    "audio_url",
    "storage_path",
    "duration_seconds",
    "country_code",
    "energy",
    "mood",
    "popularity",
    "is_favorite",
  ]) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  const { data, error } = await sb
    .from("crm_music")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function deleteMusic(id) {
  const sb = getCrmSupabase();
  const { data: row } = await sb
    .from("crm_music")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  const { error } = await sb.from("crm_music").delete().eq("id", id);
  if (error) throw error;
  if (row?.storage_path) {
    await removeStorageObject("crm-music", row.storage_path);
  }
}

module.exports = { listMusic, createMusic, uploadMusic, updateMusic, deleteMusic };
