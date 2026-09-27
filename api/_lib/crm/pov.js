const { getCrmSupabase } = require("./supabase");
const { isCrmSchemaMissingError } = require("./schema-errors");

async function getLatestPovPreset() {
  const sb = getCrmSupabase();
  const { data, error } = await sb
    .from("crm_pov_presets")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function savePovPreset(body) {
  const sb = getCrmSupabase();
  const payload = {
    hook: body.hook || null,
    niche: body.niche || null,
    emotion: body.emotion || null,
    language_code: body.language_code || null,
    country_code: body.country_code || null,
    pov_style: body.pov_style || null,
    character: body.character || null,
    ambiance: body.ambiance || null,
    duration_seconds: body.duration_seconds ? Number(body.duration_seconds) : null,
    platform: body.platform || null,
    is_draft: true,
    updated_at: new Date().toISOString(),
  };

  if (body.id) {
    const { data, error } = await sb
      .from("crm_pov_presets")
      .update(payload)
      .eq("id", body.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await sb
    .from("crm_pov_presets")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

module.exports = { getLatestPovPreset, savePovPreset };
