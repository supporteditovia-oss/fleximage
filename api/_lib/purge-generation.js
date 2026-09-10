const { DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const { getR2Config, getS3Client, listR2Objects } = require("./r2");

function parseJsonUrls(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((v) => typeof v === "string" && v.trim().length > 0);
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v) => typeof v === "string" && v.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function extractR2KeyFromUrl(url) {
  const normalized = String(url || "").trim();
  if (!normalized.startsWith("http")) return null;

  try {
    const pathname = decodeURIComponent(new URL(normalized).pathname).replace(
      /^\/+/,
      "",
    );
    if (pathname.startsWith("larps/") || pathname.startsWith("inputs/")) {
      return pathname;
    }
    return null;
  } catch {
    const markerLarps = normalized.indexOf("/larps/");
    if (markerLarps >= 0) return normalized.slice(markerLarps + 1);
    const markerInputs = normalized.indexOf("/inputs/");
    if (markerInputs >= 0) return normalized.slice(markerInputs + 1);
    return null;
  }
}

function chunk(values, size) {
  const out = [];
  for (let i = 0; i < values.length; i += size) {
    out.push(values.slice(i, i + size));
  }
  return out;
}

async function collectR2KeysForGeneration(generation) {
  const keys = new Set();
  const id = generation?.id;
  if (!id) return [];

  for (const url of [
    ...parseJsonUrls(generation.input_assets),
    ...parseJsonUrls(generation.output_assets),
    ...parseJsonUrls(generation.watermarked_assets),
  ]) {
    const key = extractR2KeyFromUrl(url);
    if (key) keys.add(key);
  }

  try {
    const listed = await listR2Objects(`larps/${id}/`, 500);
    for (const obj of listed) {
      if (obj.key) keys.add(obj.key);
    }
  } catch (err) {
    console.warn("[purge-generation] listR2Objects failed", id, err?.message);
  }

  return Array.from(keys);
}

async function deleteR2Keys(keys) {
  if (!keys.length) return 0;
  const config = getR2Config();
  const client = getS3Client();
  let deleted = 0;

  for (const batch of chunk(keys, 1000)) {
    await client.send(
      new DeleteObjectsCommand({
        Bucket: config.bucketName,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
    deleted += batch.length;
  }

  return deleted;
}

async function purgeGenerationRow(supabase, generation) {
  if (!generation?.id) {
    return { deletedKeys: 0, deletedRow: false };
  }

  const keys = await collectR2KeysForGeneration(generation);
  const deletedKeys = await deleteR2Keys(keys);

  const { error } = await supabase
    .from("generations")
    .delete()
    .eq("id", generation.id);

  if (error) throw error;

  return { deletedKeys, deletedRow: true, generationId: generation.id };
}

async function fetchExpiredGenerations(supabase, limit = 200) {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("generations")
    .select(
      "id, user_id, input_assets, output_assets, watermarked_assets, expires_at, created_at",
    )
    .not("expires_at", "is", null)
    .lte("expires_at", nowIso)
    .order("expires_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

async function purgeExpiredGenerations(supabase, limit = 200) {
  const rows = await fetchExpiredGenerations(supabase, limit);
  let purged = 0;
  let keys = 0;

  for (const row of rows) {
    const result = await purgeGenerationRow(supabase, row);
    if (result.deletedRow) {
      purged += 1;
      keys += result.deletedKeys;
    }
  }

  return { purged, keys, scanned: rows.length };
}

async function purgeGenerationsOlderThan(supabase, days, limit = 200) {
  const cutoffIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("generations")
    .select(
      "id, user_id, input_assets, output_assets, watermarked_assets, created_at, expires_at",
    )
    .lt("created_at", cutoffIso)
    .eq("status", "succeeded")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  let purged = 0;
  let keys = 0;
  for (const row of data ?? []) {
    const result = await purgeGenerationRow(supabase, row);
    if (result.deletedRow) {
      purged += 1;
      keys += result.deletedKeys;
    }
  }

  return { purged, keys, scanned: data?.length ?? 0, cutoffIso };
}

module.exports = {
  parseJsonUrls,
  extractR2KeyFromUrl,
  collectR2KeysForGeneration,
  deleteR2Keys,
  purgeGenerationRow,
  fetchExpiredGenerations,
  purgeExpiredGenerations,
  purgeGenerationsOlderThan,
};
