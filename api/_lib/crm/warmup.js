const { getCrmSupabase } = require("./supabase");
const { isCrmSchemaMissingError } = require("./schema-errors");

async function listWarmupOverview() {
  const sb = getCrmSupabase();
  const { data: accounts, error } = await sb
    .from("crm_social_accounts")
    .select(
      "id, platform, username, display_name, avatar_url, country_code, warmup_phase, warmup_day, warmup_trust_score, warmup_interactions_total, status",
    )
    .order("warmup_phase")
    .order("username");
  if (error) {
    if (isCrmSchemaMissingError(error)) return [];
    throw error;
  }

  const ids = (accounts || []).map((a) => a.id);
  let logsByAccount = {};
  if (ids.length > 0) {
    const { data: logs, error: logErr } = await sb
      .from("crm_warmup")
      .select("*")
      .in("account_id", ids)
      .order("created_at", { ascending: false });
    if (logErr && !isCrmSchemaMissingError(logErr)) throw logErr;
    for (const log of logs || []) {
      if (!logsByAccount[log.account_id]) logsByAccount[log.account_id] = [];
      if (logsByAccount[log.account_id].length < 10) {
        logsByAccount[log.account_id].push(log);
      }
    }
  }

  return (accounts || []).map((a) => ({
    ...a,
    history: logsByAccount[a.id] || [],
  }));
}

async function recordWarmupInteraction(accountId, body) {
  const sb = getCrmSupabase();
  const { data: account, error: accErr } = await sb
    .from("crm_social_accounts")
    .select("*")
    .eq("id", accountId)
    .single();
  if (accErr) throw accErr;

  const interactions = Number(body.interactions_count) || 1;
  const trustDelta = Number(body.trust_delta) || 0.5;
  const newDay =
    body.advance_day === true ? account.warmup_day + 1 : account.warmup_day;
  const newTrust = Math.min(
    100,
    Math.round((Number(account.warmup_trust_score) + trustDelta) * 10) / 10,
  );
  const newTotal = account.warmup_interactions_total + interactions;

  let phase = account.warmup_phase;
  if (phase === "new" && newDay >= 1) phase = "warming";
  if (phase === "warming" && newTrust >= 70) phase = "active";

  const { error: logErr } = await sb.from("crm_warmup").insert({
    account_id: accountId,
    day_number: newDay,
    phase: body.warmup_phase || phase,
    interactions_count: interactions,
    trust_score: newTrust,
    note: body.note || null,
  });
  if (logErr) throw logErr;

  const { data: updated, error } = await sb
    .from("crm_social_accounts")
    .update({
      warmup_day: newDay,
      warmup_trust_score: newTrust,
      warmup_interactions_total: newTotal,
      warmup_phase: body.warmup_phase || phase,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId)
    .select("*")
    .single();
  if (error) throw error;
  return updated;
}

module.exports = { listWarmupOverview, recordWarmupInteraction };
