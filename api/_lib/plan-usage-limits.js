/**
 * Quotas mensuels par abonnement + compteurs — protège la marge (V2V, clones).
 */
const { normalizePlan } = require("./billing-offers");

const PLAN_MONTHLY_QUOTAS = {
  free: { i2vClips: 0, v2vClips: 0, voiceClones: 0 },
  discovery: { i2vClips: 1, v2vClips: 0, voiceClones: 0 },
  essential: { i2vClips: 3, v2vClips: 0, voiceClones: 1 },
  ultimate: { i2vClips: 10, v2vClips: 5, voiceClones: 3 },
  unknown: { i2vClips: 1, v2vClips: 0, voiceClones: 0 },
  admin: { i2vClips: 9999, v2vClips: 9999, voiceClones: 9999 },
};

function monthStartIso() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

async function resolveUserBillingPlan(supabase, userId) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, is_subscriber, stripe_subscription_id")
    .eq("id", userId)
    .single();
  if (error || !profile) return "free";
  if (profile.role === "admin") return "admin";

  if (profile.stripe_subscription_id) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, plan_type")
      .eq("user_id", userId)
      .eq("stripe_subscription_id", profile.stripe_subscription_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sub && sub.status === "active") {
      return normalizePlan(sub.plan_type);
    }
  }

  if (profile.is_subscriber) return "unknown";
  return "free";
}

async function countVideoClipsThisMonth(supabase, userId, workflow) {
  const { count, error } = await supabase
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("generation_type", "video")
    .eq("metadata->>workflow", workflow)
    .in("status", ["queued", "processing", "succeeded"])
    .gte("created_at", monthStartIso());
  if (error) {
    console.warn("[plan-usage-limits] count video failed", error.message);
    return 0;
  }
  return count ?? 0;
}

async function countVoiceClonesThisMonth(supabase, userId) {
  const { count, error } = await supabase
    .from("voice_clones")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStartIso());
  if (error) {
    const missing =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /voice_clones/i.test(String(error.message || ""));
    if (missing) return 0;
    console.warn("[plan-usage-limits] count clones failed", error.message);
    return 0;
  }
  return count ?? 0;
}

function getQuotasForPlan(planType) {
  return PLAN_MONTHLY_QUOTAS[planType] || PLAN_MONTHLY_QUOTAS.free;
}

async function getPlanUsageSnapshot(supabase, userId, planTypeHint) {
  const planType =
    planTypeHint && PLAN_MONTHLY_QUOTAS[planTypeHint]
      ? planTypeHint
      : await resolveUserBillingPlan(supabase, userId);
  const quotas = getQuotasForPlan(planType);
  const [i2vUsed, v2vUsed, clonesUsed] = await Promise.all([
    countVideoClipsThisMonth(supabase, userId, "image_to_video"),
    countVideoClipsThisMonth(supabase, userId, "video_to_video"),
    countVoiceClonesThisMonth(supabase, userId),
  ]);

  return {
    planType,
    quotas,
    used: {
      i2vClips: i2vUsed,
      v2vClips: v2vUsed,
      voiceClones: clonesUsed,
    },
    remaining: {
      i2vClips: Math.max(0, quotas.i2vClips - i2vUsed),
      v2vClips: Math.max(0, quotas.v2vClips - v2vUsed),
      voiceClones: Math.max(0, quotas.voiceClones - clonesUsed),
    },
  };
}

/**
 * @returns {{ ok: true } | { ok: false, status: number, code: string, message: string }}
 */
function assertVideoPlanQuota(snapshot, workflow, uiLocale = "fr") {
  if (snapshot.planType === "admin") return { ok: true };

  const { quotas, used } = snapshot;
  const isFr = uiLocale !== "en";

  if (workflow === "video_to_video") {
    if (quotas.v2vClips <= 0) {
      return {
        ok: false,
        status: 403,
        code: "PLAN_V2V_NOT_INCLUDED",
        message: isFr
          ? "Motion Control (vidéo → vidéo) est réservé à l’abonnement Ultimate."
          : "Video-to-video Motion Control requires the Ultimate plan.",
      };
    }
    if (used.v2vClips >= quotas.v2vClips) {
      return {
        ok: false,
        status: 403,
        code: "PLAN_V2V_QUOTA_EXCEEDED",
        message: isFr
          ? `Quota vidéo → vidéo atteint (${quotas.v2vClips}/mois). Passe à un pack supérieur ou attends le prochain cycle.`
          : `Video-to-video monthly limit reached (${quotas.v2vClips}/month).`,
      };
    }
    return { ok: true };
  }

  if (quotas.i2vClips <= 0) {
    return {
      ok: false,
      status: 403,
      code: "PLAN_I2V_NOT_INCLUDED",
      message: isFr
        ? "La vidéo image → vidéo n’est pas incluse dans ton offre actuelle."
        : "Image-to-video is not included in your current plan.",
    };
  }
  if (used.i2vClips >= quotas.i2vClips) {
    return {
      ok: false,
      status: 403,
      code: "PLAN_I2V_QUOTA_EXCEEDED",
      message: isFr
        ? `Quota image → vidéo atteint (${quotas.i2vClips}/mois).`
        : `Image-to-video monthly limit reached (${quotas.i2vClips}/month).`,
    };
  }
  return { ok: true };
}

function assertVoiceClonePlanQuota(snapshot, uiLocale = "fr") {
  if (snapshot.planType === "admin") return { ok: true };
  const isFr = uiLocale !== "en";
  const { quotas, used } = snapshot;

  if (quotas.voiceClones <= 0) {
    return {
      ok: false,
      status: 403,
      code: "PLAN_CLONE_NOT_INCLUDED",
      message: isFr
        ? "Le clonage de voix nécessite Essentiel ou Ultimate."
        : "Voice cloning requires Essential or Ultimate.",
    };
  }
  if (used.voiceClones >= quotas.voiceClones) {
    return {
      ok: false,
      status: 403,
      code: "PLAN_CLONE_QUOTA_EXCEEDED",
      message: isFr
        ? `Quota clones voix atteint (${quotas.voiceClones}/mois).`
        : `Voice clone monthly limit reached (${quotas.voiceClones}/month).`,
    };
  }
  return { ok: true };
}

module.exports = {
  PLAN_MONTHLY_QUOTAS,
  resolveUserBillingPlan,
  getPlanUsageSnapshot,
  assertVideoPlanQuota,
  assertVoiceClonePlanQuota,
};
