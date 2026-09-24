const { getOneshotApiConfig } = require("./oneshot");
const { isDeepInfraConfigured } = require("./deepinfra");

const APP_SETTINGS_CREDITS_KEY = "oneshot_remaining_credits";
/** Compte admin uniquement : oneshot | deepinfra (Nano Banana 2). */
const ADMIN_IMAGE_PROVIDER_KEY = "admin_image_provider";

function normalizeAdminImageProvider(value) {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  return v === "oneshot" ? "oneshot" : "deepinfra";
}

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

/** Force le routeur à basculer DeepInfra dès la prochaine requête. */
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
 * Images : OneShot (clients) ou DeepInfra Nano Banana 2 (admin / fallback).
 * Kie.ai = vidéo uniquement (Runway, Aleph, Kling) — jamais pour les images ici.
 * @returns {Promise<{ provider: 'oneshot' | 'deepinfra', reason?: string, remainingCredits: number | null }>}
 */
async function resolveImageGenerationProvider(supabase, options = {}) {
  const isAdmin = Boolean(options.isAdmin ?? options.adminPreferDeepInfra);
  const adminImageProvider = normalizeAdminImageProvider(
    options.adminImageProvider,
  );
  const oneshotConfigured = Boolean(
    getOneshotApiConfig().url && getOneshotApiConfig().key,
  );
  const deepinfraConfigured = isDeepInfraConfigured();
  const remainingCredits = await getOneshotRemainingCredits(supabase);

  /** Admin : choix explicite OneShot (marketing) ou DeepInfra (Nano Banana 2). */
  if (isAdmin) {
    if (adminImageProvider === "oneshot") {
      if (!oneshotConfigured) {
        throw new Error(
          "Admin : OneShot non configuré (ONESHOT_API_URL / ONESHOT_API_KEY).",
        );
      }
      if (remainingCredits !== null && remainingCredits <= 0) {
        throw new Error(
          "Crédits OneShot épuisés — passe sur DeepInfra dans Paramètres admin ou recharge OneShot.",
        );
      }
      return {
        provider: "oneshot",
        reason: "admin_settings_oneshot",
        remainingCredits,
      };
    }
    if (!deepinfraConfigured) {
      throw new Error(
        "Admin : configure DEEPINFRA_API_KEY pour Nano Banana 2 (DeepInfra).",
      );
    }
    return {
      provider: "deepinfra",
      reason: "admin_settings_deepinfra",
      remainingCredits,
    };
  }

  const oneshotAllowed =
    oneshotConfigured &&
    (remainingCredits === null || remainingCredits > 0);

  if (oneshotAllowed) {
    return { provider: "oneshot", remainingCredits };
  }

  if (deepinfraConfigured) {
    return {
      provider: "deepinfra",
      reason: "oneshot_exhausted_deepinfra",
      remainingCredits,
    };
  }

  throw new Error(
    "Crédits OneShot épuisés — configure DEEPINFRA_API_KEY (Nano Banana 2).",
  );
}

module.exports = {
  APP_SETTINGS_CREDITS_KEY,
  ADMIN_IMAGE_PROVIDER_KEY,
  normalizeAdminImageProvider,
  getOneshotRemainingCredits,
  isOneshotCreditsExhaustedError,
  markOneshotCreditsExhausted,
  decrementOneshotCreditIfTracked,
  resolveImageGenerationProvider,
};
