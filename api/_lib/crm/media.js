const { getCrmSupabase } = require("./supabase");
const { logCrmActivity } = require("./activity");
const { isCrmSchemaMissingError } = require("./schema-errors");
const { uploadCrmMediaFile, removeStorageObject } = require("./storage");

async function listMedia(query) {
  const sb = getCrmSupabase();
  let q = sb.from("crm_media").select("*").order("created_at", { ascending: false });
  if (query.folder_key) q = q.eq("folder_key", query.folder_key);
  if (query.q) q = q.ilike("name", `%${query.q}%`);
  if (query.favorite === "1") q = q.eq("is_favorite", true);
  const { data, error } = await q.limit(500);
  if (error) {
    if (isCrmSchemaMissingError(error)) return [];
    throw error;
  }
  return data;
}

async function uploadMedia(body) {
  const uploaded = await uploadCrmMediaFile(body);
  const sb = getCrmSupabase();
  const { data, error } = await sb
    .from("crm_media")
    .insert({
      folder_key: body.folder_key || "photos/normal",
      name: body.fileName || body.name || "fichier",
      media_type: uploaded.mediaType,
      file_url: uploaded.publicUrl,
      thumbnail_url: uploaded.publicUrl,
      storage_path: uploaded.storagePath,
      tags: body.tags || [],
      status: "ready",
    })
    .select("*")
    .single();
  if (error) throw error;
  await logCrmActivity("media", `Média importé — ${data.name}`, { id: data.id });
  return data;
}

async function createMedia(body) {
  if (body.dataBase64) {
    return uploadMedia(body);
  }
  const sb = getCrmSupabase();
  const { data, error } = await sb
    .from("crm_media")
    .insert({
      folder_key: body.folder_key,
      name: body.name,
      media_type: body.media_type,
      file_url: body.file_url || null,
      thumbnail_url: body.thumbnail_url || body.file_url || null,
      storage_path: body.storage_path || null,
      tags: body.tags || [],
      language_code: body.language_code || null,
      country_code: body.country_code || null,
      niche: body.niche || null,
      status: body.status || "ready",
      is_favorite: !!body.is_favorite,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function updateMedia(id, body) {
  const sb = getCrmSupabase();
  const patch = { updated_at: new Date().toISOString() };
  const keys = [
    "folder_key",
    "name",
    "file_url",
    "thumbnail_url",
    "storage_path",
    "tags",
    "language_code",
    "country_code",
    "niche",
    "status",
    "is_favorite",
  ];
  for (const k of keys) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  const { data, error } = await sb
    .from("crm_media")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function deleteMedia(ids) {
  const sb = getCrmSupabase();
  const { data: rows } = await sb
    .from("crm_media")
    .select("id, storage_path")
    .in("id", ids);
  const { error } = await sb.from("crm_media").delete().in("id", ids);
  if (error) throw error;
  for (const row of rows || []) {
    await removeStorageObject("crm-media", row.storage_path);
  }
}

module.exports = { listMedia, createMedia, uploadMedia, updateMedia, deleteMedia };
