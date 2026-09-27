const { getCrmSupabase } = require("../supabase");
const { logCrmActivity } = require("../activity");
const { encryptSecret } = require("./crypto");
const { localeFromCountry } = require("./config");
const { isCrmSchemaMissingError, crmSchemaNotReadyError } = require("../schema-errors");

const ACCOUNT_SELECT =
  "id, platform, username, display_name, avatar_url, banner_url, country_code, language_code, timezone, status, warmup_phase, warmup_day, warmup_trust_score, warmup_interactions_total, followers, likes, views, provider_account_id, created_at, updated_at";

/**
 * @param {object} p
 * @param {'tiktok'|'instagram'|'youtube'} p.platform
 * @param {string} p.providerAccountId
 * @param {string} p.username
 * @param {string|null} p.displayName
 * @param {string|null} p.avatarUrl
 * @param {string} p.countryCode
 * @param {object} p.tokens accessToken, refreshToken?, expiresAt?, scope?, tokenType?
 * @param {object} p.rawProfile
 */
async function upsertOAuthAccount(p) {
  const sb = getCrmSupabase();
  const locale = localeFromCountry(p.countryCode);
  const now = new Date().toISOString();

  const { data: existing } = await sb
    .from("crm_social_accounts")
    .select("id")
    .eq("platform", p.platform)
    .eq("provider_account_id", p.providerAccountId)
    .maybeSingle();

  let accountId = existing?.id;
  const accountRow = {
    platform: p.platform,
    provider_account_id: p.providerAccountId,
    username: p.username,
    display_name: p.displayName || p.username,
    avatar_url: p.avatarUrl,
    country_code: p.countryCode,
    language_code: locale.language,
    timezone: locale.timezone,
    status: "active",
    oauth_meta: {
      connected_via: "oauth",
      connected_at: now,
      profile: p.rawProfile,
    },
    updated_at: now,
  };

  if (accountId) {
    const { data, error } = await sb
      .from("crm_social_accounts")
      .update(accountRow)
      .eq("id", accountId)
      .select(ACCOUNT_SELECT)
      .single();
    if (error) throw error;
    await saveTokens(accountId, p);
    await logCrmActivity(
      "account",
      `Compte reconnecté @${data.username} (${data.platform})`,
      { id: data.id },
    );
    return data;
  }

  const { data, error } = await sb
    .from("crm_social_accounts")
    .insert({
      ...accountRow,
      warmup_phase: "new",
      warmup_day: 0,
      followers: p.followers || 0,
    })
    .select(ACCOUNT_SELECT)
    .single();
  if (error) {
    if (isCrmSchemaMissingError(error)) throw crmSchemaNotReadyError();
    throw error;
  }
  accountId = data.id;
  await saveTokens(accountId, p);
  await logCrmActivity("account", `Compte OAuth @${data.username} (${data.platform})`, {
    id: data.id,
  });
  return data;
}

async function saveTokens(accountId, p) {
  const sb = getCrmSupabase();
  const row = {
    account_id: accountId,
    platform: p.platform,
    provider_account_id: p.providerAccountId,
    access_token_enc: encryptSecret(p.tokens.accessToken),
    refresh_token_enc: p.tokens.refreshToken
      ? encryptSecret(p.tokens.refreshToken)
      : null,
    token_type: p.tokens.tokenType || "Bearer",
    scope: p.tokens.scope || null,
    expires_at: p.tokens.expiresAt || null,
    raw_profile: p.rawProfile || {},
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb.from("crm_oauth_tokens").upsert(row, {
    onConflict: "platform,provider_account_id",
  });
  if (error) {
    if (isCrmSchemaMissingError(error)) throw crmSchemaNotReadyError();
    throw error;
  }
}

async function disconnectAccount(accountId) {
  const sb = getCrmSupabase();
  await sb.from("crm_oauth_tokens").delete().eq("account_id", accountId);
  const { data, error } = await sb
    .from("crm_social_accounts")
    .update({
      status: "disconnected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId)
    .select(ACCOUNT_SELECT)
    .single();
  if (error) throw error;
  await logCrmActivity("account", `Compte déconnecté @${data.username}`, { id: accountId });
  return data;
}

module.exports = { upsertOAuthAccount, disconnectAccount, ACCOUNT_SELECT };
