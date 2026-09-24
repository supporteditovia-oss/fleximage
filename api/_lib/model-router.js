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

function isOneshotCreditsExhaustedError(err) {
  const status = err && err.status;
  if (status === 402 || status === 429) return true;
  const text = String(
    (err && err.message) || (err && err.body) || err || "",
  ).toLowerCase();
  return (
    /insufficient.*credit/.test(text) ||
    /out of credit/.test(text) ||
    /not enough credit/.test(text) ||
    /credit.*depleted/.test(text) ||
    /quota.*exceed/.test(text) ||
    /payment required/.test(text) ||
    /billing/.test(text)
  );
}

/** Force le routeur à basculer DeepInfra/Kie dès la prochaine requête. */
async function markOneshotCreditsExhausted(supabase) {
  if (!supabase) return;
  try {
    await supabase.from("app_settings").upsert(
      {
        key: APP_SETTINGS_CREDITS_KEY,
        value: "0",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  } catch (err) {
    console.warn("[model-router] mark exhausted skipped", err?.message);
  }
}

async function decrementOneshotCreditIfTracked(supabase) {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", APP_SETTINGS_CREDITS_KEY)
      .maybeSingle();
    if (!error && data?.value != null && String(data.value).trim() !== "") {
      const current = Number(data.value);
      if (!Number.isFinite(current)) return;
      const next = Math.max(0, Math.floor(current) - 1);
      await supabase
        .from("app_settings")
        .update({ value: String(next), updated_at: new Date().toISOString() })
        .eq("key", APP_SETTINGS_CREDITS_KEY);
      return;
    }

    const raw = process.env.ONESHOT_REMAINING_CREDITS;
    if (raw == null || String(raw).trim() === "") return;
    const fromEnv = Number(raw);
    if (!Number.isFinite(fromEnv)) return;
    const next = Math.max(0, Math.floor(fromEnv) - 1);
    await supabase.from("app_settings").upsert(
      {
        key: APP_SETTINGS_CREDITS_KEY,
        value: String(next),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
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
    if (hasReferenceImages) {
      if (kieConfigured) {
        return {
          provider: "kie",
          reason: "deepinfra_no_refs_fallback_kie",
          remainingCredits,
        };
      }
      throw new Error(
        "Crédits OneShot épuisés : les générations avec photos nécessitent KIE_AI_API_KEY (DeepInfra seul = texte sans refs).",
      );
    }
    return { provider: "deepinfra", remainingCredits };
  }

  if (kieConfigured) {
    return { provider: "kie", reason: "deepinfra_missing", remainingCredits };
  }

  throw new Error(
    "Crédits OneShot épuisés — configure DEEPINFRA_API_KEY (et KIE_AI_API_KEY si photos).",
  );
}

module.exports = {
  APP_SETTINGS_CREDITS_KEY,
  getOneshotRemainingCredits,
  isOneshotCreditsExhaustedError,
  markOneshotCreditsExhausted,
  decrementOneshotCreditIfTracked,
  resolveImageGenerationProvider,
};
