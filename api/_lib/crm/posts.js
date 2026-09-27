const { getCrmSupabase } = require("./supabase");
const { logCrmActivity } = require("./activity");

const POST_SELECT =
  "id, account_id, platform, scheduled_at, status, media_id, music_id, caption, hashtags, published_at, created_at, updated_at, account:crm_social_accounts(id, username, display_name, country_code, language_code, timezone), media:crm_media(id, name, thumbnail_url), music:crm_music(id, title)";

async function listPosts(range) {
  const sb = getCrmSupabase();
  let q = sb.from("crm_posts").select(POST_SELECT).order("scheduled_at");
  if (range?.from) q = q.gte("scheduled_at", range.from);
  if (range?.to) q = q.lte("scheduled_at", range.to);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

async function createPost(body) {
  const sb = getCrmSupabase();
  const { data: account, error: accErr } = await sb
    .from("crm_social_accounts")
    .select("platform, language_code, timezone, country_code")
    .eq("id", body.account_id)
    .single();
  if (accErr) throw accErr;

  const { data, error } = await sb
    .from("crm_posts")
    .insert({
      account_id: body.account_id,
      platform: body.platform || account.platform,
      scheduled_at: body.scheduled_at,
      status: body.status || "scheduled",
      media_id: body.media_id || null,
      music_id: body.music_id || null,
      caption: body.caption || null,
      hashtags: body.hashtags || [],
    })
    .select(POST_SELECT)
    .single();
  if (error) throw error;
  await logCrmActivity("publish", `Publication programmée — ${account.platform}`, {
    postId: data.id,
  });
  return {
    ...data,
    inferred: {
      language: account.language_code,
      timezone: account.timezone,
      country: account.country_code,
    },
  };
}

async function updatePost(id, body) {
  const sb = getCrmSupabase();
  const patch = { updated_at: new Date().toISOString() };
  for (const k of [
    "scheduled_at",
    "status",
    "media_id",
    "music_id",
    "caption",
    "hashtags",
    "published_at",
  ]) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  const { data, error } = await sb
    .from("crm_posts")
    .update(patch)
    .eq("id", id)
    .select(POST_SELECT)
    .single();
  if (error) throw error;
  return data;
}

async function deletePost(id) {
  const sb = getCrmSupabase();
  const { error } = await sb.from("crm_posts").delete().eq("id", id);
  if (error) throw error;
}

module.exports = { listPosts, createPost, updatePost, deletePost };
