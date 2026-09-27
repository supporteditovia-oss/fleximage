const { getCrmSupabase } = require("./supabase");
const { logCrmActivity } = require("./activity");
const { isCrmSchemaMissingError } = require("./schema-errors");

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

async function createMusic(body) {
  const sb = getCrmSupabase();
  const { data, error } = await sb
    .from("crm_music")
    .insert({
      title: body.title,
      artist: body.artist || null,
      audio_url: body.audio_url,
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
  await logCrmActivity("music", `Musique ajoutée — ${data.title}`, { id: data.id });
  return data;
}

async function updateMusic(id, body) {
  const sb = getCrmSupabase();
  const patch = {};
  for (const k of [
    "title",
    "artist",
    "audio_url",
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
  const { error } = await sb.from("crm_music").delete().eq("id", id);
  if (error) throw error;
}

module.exports = { listMusic, createMusic, updateMusic, deleteMusic };
