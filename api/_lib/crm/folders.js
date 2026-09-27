const { getCrmSupabase } = require("./supabase");
const {
  isCrmSchemaMissingError,
  crmSchemaNotReadyError,
} = require("./schema-errors");

const DEFAULT_FOLDERS = [
  { folder_key: "photos/normal", parent_group: "photos", label: "Photos normales", sort_order: 1 },
  { folder_key: "photos/snapchat", parent_group: "photos", label: "Photos Snapchat", sort_order: 2 },
  { folder_key: "videos/instagram", parent_group: "videos", label: "Vidéos Instagram", sort_order: 1 },
  { folder_key: "videos/recording", parent_group: "videos", label: "Vidéos Enregistrement", sort_order: 2 },
  { folder_key: "videos/final", parent_group: "videos", label: "Vidéos Finales", sort_order: 3 },
];

async function listFolders() {
  const sb = getCrmSupabase();
  const { data, error } = await sb
    .from("crm_media_folders")
    .select("*")
    .order("parent_group")
    .order("sort_order");
  if (error) {
    if (isCrmSchemaMissingError(error)) {
      return DEFAULT_FOLDERS.map((f) => ({ ...f, id: f.folder_key }));
    }
    throw error;
  }
  return data?.length ? data : DEFAULT_FOLDERS.map((f) => ({ ...f, id: f.folder_key }));
}

async function createFolder(body) {
  const sb = getCrmSupabase();
  const parent = body.parent_group === "videos" ? "videos" : "photos";
  const slug = String(body.label || "nouveau")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();
  const folder_key = `${parent}/${slug || "dossier"}`;

  const { data, error } = await sb
    .from("crm_media_folders")
    .insert({
      folder_key,
      parent_group: parent,
      label: String(body.label || "Nouveau dossier"),
      sort_order: Number(body.sort_order) || 99,
    })
    .select("*")
    .single();
  if (error) {
    if (isCrmSchemaMissingError(error)) throw crmSchemaNotReadyError();
    throw error;
  }
  return data;
}

module.exports = { listFolders, createFolder, DEFAULT_FOLDERS };
