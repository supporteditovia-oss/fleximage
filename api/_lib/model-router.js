const { getOneshotApiConfig } = require("./oneshot");
const { isKieConfigured } = require("./kie");
const { isDeepInfraConfigured } = require("./deepinfra");

const APP_SETTINGS_CREDITS_KEY = "oneshot_remaining_credits";

/**
 * Remaining OneShot credits: app_settings (DB) then ONESHOT_REMAINING_CREDITS env.
 * null = unknown → treat as "use OneShot when configured" (legacy prod).
 */
async function getOneshotRemainingCredits(supabase) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", APP_SETTINGS_CREDITS_KEY)
        .maybeSingle();
      if (!error && data?.value != null && String(data.value).trim() !== "") {
        const n = Number(data.value);
        if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
      }
    } catch {
      /* ignore */
    }
  }

  const raw = process.env.ONESHOT_REMAINING_CREDITS;
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
}

async function decrementOneshotCreditIfTracked(supabase) {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", APP_SETTINGS_CREDITS_KEY)
      .maybeSingle();
    if (error || data?.value == null) return;
    const current = Number(data.value);
    if (!Number.isFinite(current)) return;
    const next = Math.max(0, Math.floor(current) - 1);
    await supabase
      .from("app_settings")
      .update({ value: String(next), updated_at: new Date().toISOString() })
      .eq("key", APP_SETTINGS_CREDITS_KEY);
  } catch (err) {
    console.warn("[model-router] decrement credits skipped", err?.message);
  }
}

/**
 * Choix transparent OneShot → DeepInfra (puis Kie secours si refs / erreur).
 * @returns {Promise<{ provider: 'oneshot' | 'deepinfra' | 'kie', reason?: string, remainingCredits: number | null }>}
 */
async function resolveImageGenerationProvider(supabase, options = {}) {
  const hasReferenceImages = Boolean(options.hasReferenceImages);
  const forceLegacyKie = Boolean(options.forceKieAi);
  const oneshotConfigured = Boolean(
    getOneshotApiConfig().url && getOneshotApiConfig().key,
  );
  const deepinfraConfigured = isDeepInfraConfigured();
  const kieConfigured = isKieConfigured();
  const remainingCredits = await getOneshotRemainingCredits(supabase);

  if (forceLegacyKie) {
    if (deepinfraConfigured) {
      return { provider: "deepinfra", reason: "force_kie_ai→deepinfra", remainingCredits };
    }
    if (kieConfigured) {
      return { provider: "kie", reason: "force_kie_ai", remainingCredits };
    }
    throw new Error("Aucun moteur image configuré (DeepInfra / Kie)");
  }

  const oneshotAllowed =
    oneshotConfigured &&
    (remainingCredits === null || remainingCredits > 0);

  if (oneshotAllowed) {
    return { provider: "oneshot", remainingCredits };
  }

  if (deepinfraConfigured) {
    if (hasReferenceImages && kieConfigured) {
      return {
        provider: "kie",
        reason: "deepinfra_no_refs_fallback_kie",
        remainingCredits,
      };
    }
    return { provider: "deepinfra", remainingCredits };
  }

  if (kieConfigured) {
    return { provider: "kie", reason: "deepinfra_missing", remainingCredits };
  }

  if (oneshotConfigured) {
    return { provider: "oneshot", reason: "credits_exhausted_last_resort", remainingCredits };
  }

  throw new Error("Aucun moteur image configuré");
}

module.exports = {
  APP_SETTINGS_CREDITS_KEY,
  getOneshotRemainingCredits,
  decrementOneshotCreditIfTracked,
  resolveImageGenerationProvider,
};
