const { getCrmSupabase } = require("./supabase");
const { isCrmSchemaMissingError } = require("./schema-errors");

const MEDIA_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};

const MUSIC_EXT = {
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
};

function sanitizeName(name) {
  return String(name || "file")
    .replace(/[^\w.\-]+/g, "_")
    .slice(0, 120);
}

function decodeBase64Payload(dataBase64) {
  const raw = String(dataBase64 || "");
  const b64 = raw.includes(",") ? raw.split(",").pop() : raw;
  return Buffer.from(b64, "base64");
}

async function uploadBuffer(bucket, objectPath, buffer, contentType) {
  const sb = getCrmSupabase();
  const { error } = await sb.storage.from(bucket).upload(objectPath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) {
    if (/Bucket not found/i.test(error.message || "")) {
      const err = new Error(
        "Bucket Storage manquant — applique la migration CRM Storage",
      );
      err.code = "CRM_BUCKET_MISSING";
      throw err;
    }
    throw error;
  }
  const { data } = sb.storage.from(bucket).getPublicUrl(objectPath);
  return { publicUrl: data.publicUrl, storagePath: objectPath };
}

async function removeStorageObject(bucket, storagePath) {
  if (!storagePath) return;
  try {
    const sb = getCrmSupabase();
    await sb.storage.from(bucket).remove([storagePath]);
  } catch {
    /* ignore */
  }
}

function extFromFileName(name) {
  const m = String(name || "").match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : "";
}

const EXT_TO_MIME = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
};

function resolveContentType(contentType, fileName, map) {
  let ct = String(contentType || "").toLowerCase();
  if (!map[ct]) {
    const ext = extFromFileName(fileName);
    ct = EXT_TO_MIME[ext] || "";
  }
  if (!map[ct]) {
    throw Object.assign(new Error(`Type de fichier non supporté: ${contentType || extFromFileName(fileName)}`), {
      status: 400,
    });
  }
  return { contentType: ct, ext: map[ct] };
}

async function uploadCrmMediaFile(body) {
  const { contentType, ext } = resolveContentType(
    body.contentType,
    body.fileName,
    MEDIA_EXT,
  );
  const buffer = decodeBase64Payload(body.dataBase64);
  if (!buffer.length) {
    throw Object.assign(new Error("Fichier vide"), { status: 400 });
  }
  const folder = String(body.folder_key || "photos/normal");
  const name = sanitizeName(body.fileName || `upload.${ext}`);
  const objectPath = `${folder}/${Date.now()}_${name}`;
  const { publicUrl, storagePath } = await uploadBuffer(
    "crm-media",
    objectPath,
    buffer,
    contentType,
  );
  return { publicUrl, storagePath, mediaType: contentType.startsWith("video") ? "video" : "image" };
}

async function uploadCrmMusicFile(body) {
  const { contentType, ext } = resolveContentType(
    body.contentType,
    body.fileName,
    MUSIC_EXT,
  );
  const buffer = decodeBase64Payload(body.dataBase64);
  if (!buffer.length) {
    throw Object.assign(new Error("Fichier vide"), { status: 400 });
  }
  const name = sanitizeName(body.fileName || `track.${ext}`);
  const objectPath = `tracks/${Date.now()}_${name}`;
  const { publicUrl, storagePath } = await uploadBuffer(
    "crm-music",
    objectPath,
    buffer,
    contentType,
  );
  return { publicUrl, storagePath };
}

async function uploadCrmAvatar(body) {
  const { contentType, ext } = resolveContentType(
    body.contentType || "image/jpeg",
    body.fileName,
    MEDIA_EXT,
  );
  const buffer = decodeBase64Payload(body.dataBase64);
  if (!buffer.length) return null;
  const objectPath = `avatars/${Date.now()}_${sanitizeName(body.fileName || `avatar.${ext}`)}`;
  const { publicUrl } = await uploadBuffer(
    "crm-media",
    objectPath,
    buffer,
    contentType,
  );
  return publicUrl;
}

module.exports = {
  uploadCrmMediaFile,
  uploadCrmMusicFile,
  uploadCrmAvatar,
  removeStorageObject,
  isCrmSchemaMissingError,
};
