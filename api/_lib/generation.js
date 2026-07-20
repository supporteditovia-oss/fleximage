const IMAGE_CREDIT_COST = 10;
const OUTPUT_ASPECT_RATIO = "9:16";
const PROVIDER_POLL_HARD_TIMEOUT_MS = 15 * 60 * 1000;

async function checkGenerationLimits(supabase, userId) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_subscriber, role, generation_count, credits")
    .eq("id", userId)
    .single();

  if (!profile) {
    return {
      allowed: false,
      reason: "Profil introuvable",
      isSubscriber: false,
      isAdmin: false,
    };
  }

  if (profile.role === "admin") {
    return {
      allowed: true,
      isSubscriber: true,
      isAdmin: true,
      generationCount: profile.generation_count,
    };
  }

  if (profile.credits < IMAGE_CREDIT_COST) {
    return {
      allowed: false,
      reason: profile.is_subscriber
        ? "Plus assez de jetons sur ton abonnement."
        : "Plus assez de jetons pour générer.",
      isSubscriber: profile.is_subscriber,
      isAdmin: false,
      generationCount: profile.generation_count,
    };
  }

  return {
    allowed: true,
    isSubscriber: profile.is_subscriber,
    isAdmin: false,
    generationCount: profile.generation_count,
  };
}

function getBillableCreditCost(limitResult) {
  return limitResult.isAdmin ? 0 : IMAGE_CREDIT_COST;
}

async function applyCreditDelta(supabase, params) {
  return supabase.rpc("apply_credit_delta", {
    p_user_id: params.userId,
    p_delta: params.delta,
    p_reason: params.reason,
    p_generation_id: params.generationId || null,
    p_subscription_id: null,
    p_idempotency_key: params.idempotencyKey,
    p_metadata: params.metadata || {},
  });
}

async function deductGenerationCredits(supabase, params) {
  if (params.creditCost === 0) return null;
  const { error } = await applyCreditDelta(supabase, {
    userId: params.userId,
    delta: -params.creditCost,
    reason: "generation_charge",
    generationId: params.generationId,
    idempotencyKey: `generation:${params.generationId}:charge`,
    metadata: params.metadata || {},
  });
  return error;
}

async function refundGenerationCreditsIfCharged(supabase, params) {
  const { data: charges, error: chargeFetchErr } = await supabase
    .from("credit_ledger")
    .select("delta")
    .eq("generation_id", params.generationId)
    .eq("reason", "generation_charge");

  if (chargeFetchErr) throw chargeFetchErr;

  const refundAmount = (charges || []).reduce((total, entry) => {
    const delta = Number(entry.delta);
    return delta < 0 ? total + Math.abs(delta) : total;
  }, 0);

  if (refundAmount === 0) return null;

  const { error } = await applyCreditDelta(supabase, {
    userId: params.userId,
    delta: refundAmount,
    reason: "refund",
    generationId: params.generationId,
    idempotencyKey: `generation:${params.generationId}:refund`,
    metadata: {
      source: params.source,
      fail_message: params.failMessage || null,
      ...(params.metadata || {}),
    },
  });
  return error;
}

async function recordGeneration(supabase, userId) {
  await supabase.rpc("increment_generation_count", { p_user_id: userId });
}

function extractImageUrls(parsed) {
  if (!parsed) return [];

  if (Array.isArray(parsed)) {
    const urls = parsed.filter(
      (item) => typeof item === "string" && item.startsWith("http"),
    );
    if (urls.length > 0) return urls;
    const fromObjects = parsed
      .filter((item) => typeof item === "object" && item !== null)
      .map((item) => item.url || item.image_url || item.imageUrl || item.src)
      .filter((u) => typeof u === "string" && u.startsWith("http"));
    if (fromObjects.length > 0) return fromObjects;
  }

  if (typeof parsed === "object" && parsed !== null) {
    for (const key of ["resultUrls", "images", "urls", "output", "data", "results", "result"]) {
      const value = parsed[key];
      if (Array.isArray(value) || (value && typeof value === "object")) {
        const extracted = extractImageUrls(value);
        if (extracted.length > 0) return extracted;
      }
    }
    for (const key of ["url", "image_url", "imageUrl", "src", "image", "output"]) {
      const value = parsed[key];
      if (typeof value === "string" && value.startsWith("http")) return [value];
    }
    for (const value of Object.values(parsed)) {
      if (typeof value === "object" && value !== null) {
        const extracted = extractImageUrls(value);
        if (extracted.length > 0) return extracted;
      }
    }
  }

  if (typeof parsed === "string" && parsed.startsWith("http")) return [parsed];
  return [];
}

function toAssetList(value) {
  if (Array.isArray(value)) return value.filter((u) => typeof u === "string");
  return [];
}

function toClientStatus(status) {
  if (status === "succeeded" || status === "success") return "success";
  if (status === "failed" || status === "fail") return "fail";
  return "waiting";
}

function toDbStatus(status) {
  if (status === "success") return "succeeded";
  if (status === "fail") return "failed";
  return "processing";
}

module.exports = {
  IMAGE_CREDIT_COST,
  OUTPUT_ASPECT_RATIO,
  PROVIDER_POLL_HARD_TIMEOUT_MS,
  checkGenerationLimits,
  getBillableCreditCost,
  deductGenerationCredits,
  refundGenerationCreditsIfCharged,
  recordGeneration,
  extractImageUrls,
  toAssetList,
  toClientStatus,
  toDbStatus,
};
