const { getCrmSupabase } = require("./supabase");
const { logCrmActivity } = require("./activity");

const ACCOUNT_SELECT =
  "id, platform, username, display_name, avatar_url, banner_url, country_code, language_code, timezone, status, warmup_phase, warmup_day, warmup_trust_score, warmup_interactions_total, followers, likes, views, created_at, updated_at";

async function listAccounts() {
  const sb = getCrmSupabase();
  const { data, error } = await sb
    .from("crm_social_accounts")
    .select(ACCOUNT_SELECT)
    .order("platform")
    .order("username");
  if (error) throw error;
  return data;
}

async function getAccount(id) {
  const sb = getCrmSupabase();
  const { data: account, error } = await sb
    .from("crm_social_accounts")
    .select(ACCOUNT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!account) return null;

  const [posts, analytics, warmupLogs, daily] = await Promise.all([
    sb
      .from("crm_posts")
      .select("id, scheduled_at, status, platform, caption, published_at")
      .eq("account_id", id)
      .order("scheduled_at", { ascending: false })
      .limit(12),
    sb
      .from("crm_post_analytics")
      .select("views, likes, comments, shares, viral_score, recorded_at, post_id")
      .eq("account_id", id)
      .order("recorded_at", { ascending: false })
      .limit(20),
    sb
      .from("crm_warmup_logs")
      .select("*")
      .eq("account_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    sb
      .from("crm_account_daily_metrics")
      .select("*")
      .eq("account_id", id)
      .order("metric_date", { ascending: false })
      .limit(14),
  ]);

  const viralScore =
    analytics.data?.length > 0
      ? Math.round(
          analytics.data.reduce((s, r) => s + Number(r.viral_score || 0), 0) /
            analytics.data.length,
        )
      : 0;

  return {
    account,
    recentPosts: posts.data || [],
    analytics: analytics.data || [],
    warmupLogs: warmupLogs.data || [],
    growthDaily: (daily.data || []).reverse(),
    viralScore,
  };
}

async function createAccount(body) {
  const sb = getCrmSupabase();
  const payload = {
    platform: body.platform,
    username: String(body.username || "").replace(/^@/, ""),
    display_name: body.display_name || body.username,
    avatar_url: body.avatar_url || null,
    banner_url: body.banner_url || null,
    country_code: (body.country_code || "FR").toUpperCase().slice(0, 2),
    language_code: body.language_code || "fr",
    timezone: body.timezone || "Europe/Paris",
    status: body.status || "active",
    warmup_phase: body.warmup_phase || "new",
    followers: Number(body.followers) || 0,
    likes: Number(body.likes) || 0,
    views: Number(body.views) || 0,
  };
  const { data, error } = await sb
    .from("crm_social_accounts")
    .insert(payload)
    .select(ACCOUNT_SELECT)
    .single();
  if (error) throw error;
  await logCrmActivity("account", `Compte ajouté @${data.username} (${data.platform})`, {
    id: data.id,
  });
  return data;
}

async function updateAccount(id, body) {
  const sb = getCrmSupabase();
  const allowed = [
    "platform",
    "username",
    "display_name",
    "avatar_url",
    "banner_url",
    "country_code",
    "language_code",
    "timezone",
    "status",
    "warmup_phase",
    "warmup_day",
    "warmup_trust_score",
    "warmup_interactions_total",
    "followers",
    "likes",
    "views",
  ];
  const patch = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  if (patch.username) patch.username = String(patch.username).replace(/^@/, "");
  if (patch.country_code)
    patch.country_code = String(patch.country_code).toUpperCase().slice(0, 2);

  const { data, error } = await sb
    .from("crm_social_accounts")
    .update(patch)
    .eq("id", id)
    .select(ACCOUNT_SELECT)
    .single();
  if (error) throw error;
  return data;
}

async function deleteAccount(id) {
  const sb = getCrmSupabase();
  const { error } = await sb.from("crm_social_accounts").delete().eq("id", id);
  if (error) throw error;
  await logCrmActivity("account", "Compte supprimé", { id });
}

module.exports = {
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
};
