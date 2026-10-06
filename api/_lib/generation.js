const IMAGE_CREDIT_COST = 10;
const OUTPUT_ASPECT_RATIO = "9:16";
/** Base wall-clock budget before hard-fail. Vision-QA retries get extra time (see status.js). */
const PROVIDER_POLL_HARD_TIMEOUT_MS = 3.5 * 60 * 1000;
/** Extra budget per vision-QA corrective job so retries aren't killed mid-flight. */
const PROVIDER_POLL_QA_RETRY_EXTRA_MS = 100_000;


const LIMIT_REASON_COPY = {
  "Profil introuvable": {
    fr: "Profil introuvable",
    en: "Profile not found",
  },
  "Plus assez de jetons sur ton abonnement.": {
    fr: "Plus assez de jetons sur ton abonnement.",
    en: "Not enough credits on your subscription.",
  },
  "Plus assez de jetons pour générer.": {
    fr: "Plus assez de jetons pour générer.",
    en: "Not enough credits to generate.",
  },
};

function translateLimitReason(reason, locale = "fr") {
  const entry = LIMIT_REASON_COPY[reason];
  if (!entry) return reason;
  return locale === "en" ? entry.en : entry.fr;
}

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

async function generationCreditsAlreadyCharged(supabase, generationId) {
  const { data: charges, error: chargeFetchErr } = await supabase
    .from("credit_ledger")
    .select("delta")
    .eq("generation_id", generationId)
    .eq("reason", "generation_charge");

  if (chargeFetchErr) throw chargeFetchErr;

  return (charges || []).some((entry) => Number(entry.delta) < 0);
}

/** Débit différé (ex. Transformation Pro) — idempotent via clé ledger. */
async function chargeGenerationCreditsIfNotYetCharged(supabase, params) {
  if (params.creditCost === 0) return null;
  const already = await generationCreditsAlreadyCharged(
    supabase,
    params.generationId,
  );
  if (already) return null;
  return deductGenerationCredits(supabase, params);
}

async function getGenerationChargeTotal(supabase, generationId) {
  const { data: charges, error: chargeFetchErr } = await supabase
    .from("credit_ledger")
    .select("delta")
    .eq("generation_id", generationId)
    .eq("reason", "generation_charge");

  if (chargeFetchErr) throw chargeFetchErr;

  return (charges || []).reduce((total, entry) => {
    const delta = Number(entry.delta);
    return delta < 0 ? total + Math.abs(delta) : total;
  }, 0);
}

async function generationRefundTotal(supabase, generationId) {
  const { data: refunds, error: refundFetchErr } = await supabase
    .from("credit_ledger")
    .select("delta")
    .eq("generation_id", generationId)
    .eq("reason", "refund");

  if (refundFetchErr) throw refundFetchErr;

  return (refunds || []).reduce((total, entry) => {
    const delta = Number(entry.delta);
    return delta > 0 ? total + delta : total;
  }, 0);
}

async function refundGenerationCreditsIfCharged(supabase, params) {
  const chargeTotal = await getGenerationChargeTotal(
    supabase,
    params.generationId,
  );
  if (chargeTotal === 0) return null;

  const alreadyRefunded = await generationRefundTotal(
    supabase,
    params.generationId,
  );
  if (alreadyRefunded >= chargeTotal) return null;
  if (alreadyRefunded > 0 && alreadyRefunded < chargeTotal) {
    console.error("[credits] partial refund on generation — manual review", {
      generationId: params.generationId,
      chargeTotal,
      alreadyRefunded,
    });
    return null;
  }

  const { error } = await applyCreditDelta(supabase, {
    userId: params.userId,
    delta: chargeTotal,
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

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Remboursement idempotent avec retries — échec génération vidéo/image sans livrable.
 */
async function ensureGenerationCreditsRefunded(supabase, params) {
  const chargeTotal = await getGenerationChargeTotal(
    supabase,
    params.generationId,
  );
  if (chargeTotal === 0) {
    return { ok: true, hadCharge: false, refundedAmount: 0, chargeTotal: 0 };
  }

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const before = await generationRefundTotal(supabase, params.generationId);
      if (before >= chargeTotal) {
        return {
          ok: true,
          hadCharge: true,
          refundedAmount: before,
          chargeTotal,
          alreadyIssued: true,
        };
      }

      const err = await refundGenerationCreditsIfCharged(supabase, params);
      if (err) {
        lastError = err;
        console.error("[credits] refund attempt failed", {
          attempt,
          generationId: params.generationId,
          message: err.message || String(err),
        });
        if (attempt < 3) await sleepMs(350 * attempt);
        continue;
      }

      const after = await generationRefundTotal(supabase, params.generationId);
      return {
        ok: after >= chargeTotal,
        hadCharge: true,
        refundedAmount: after,
        chargeTotal,
      };
    } catch (err) {
      lastError = err;
      console.error("[credits] refund attempt threw", {
        attempt,
        generationId: params.generationId,
        err,
      });
      if (attempt < 3) await sleepMs(350 * attempt);
    }
  }

  const partial = await generationRefundTotal(supabase, params.generationId).catch(
    () => 0,
  );
  return {
    ok: partial >= chargeTotal,
    hadCharge: true,
    refundedAmount: partial,
    chargeTotal,
    error: lastError,
  };
}

function reconcileFailMessageWithRefund(failMessage, refundResult) {
  const msg = String(failMessage || "").trim();
  if (!refundResult?.hadCharge) return msg;
  if (refundResult.ok && refundResult.refundedAmount > 0) {
    if (/rembours|reembols|refund/i.test(msg)) return msg;
    return msg ? `${msg} Jetons remboursés.` : "Jetons remboursés.";
  }
  const withoutFalsePromise = msg
    .replace(/\s*Jetons remboursés\.?/gi, "")
    .replace(/\s*Tes crédits ont été remboursés[^.]*\.?/gi, "")
    .trim();
  return (
    withoutFalsePromise +
    " Tes jetons n’ont pas pu être recrédités automatiquement — écris à support.luxeflexia@gmail.com avec l’heure de la génération, on te les remet sous 24 h."
  ).trim();
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
      .map(
        (item) =>
          item.url ||
          item.image_url ||
          item.imageUrl ||
          item.src ||
          item.uri ||
          item.downloadUrl ||
          item.download_url,
      )
      .filter((u) => typeof u === "string" && u.startsWith("http"));
    if (fromObjects.length > 0) return fromObjects;
  }

  if (typeof parsed === "object" && parsed !== null) {
    for (const key of [
      "resultUrls",
      "images",
      "urls",
      "output",
      "outputs",
      "files",
      "assets",
      "data",
      "results",
      "result",
    ]) {
      const value = parsed[key];
      if (Array.isArray(value) || (value && typeof value === "object")) {
        const extracted = extractImageUrls(value);
        if (extracted.length > 0) return extracted;
      }
    }
    for (const key of [
      "url",
      "image_url",
      "imageUrl",
      "src",
      "image",
      "output",
      "uri",
      "downloadUrl",
      "download_url",
    ]) {
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

/** Normalize provider job status strings. */
function normalizeProviderStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

function isProviderSuccessStatus(status) {
  const s = normalizeProviderStatus(status);
  return (
    s === "completed" ||
    s === "complete" ||
    s === "success" ||
    s === "succeeded" ||
    s === "done" ||
    s === "finished"
  );
}

function isProviderFailStatus(status) {
  const s = normalizeProviderStatus(status);
  return (
    s === "failed" ||
    s === "fail" ||
    s === "error" ||
    s === "cancelled" ||
    s === "canceled" ||
    s === "expired"
  );
}

async function withTimeout(promise, ms, onTimeoutValue) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms);
      }),
    ]);
  } catch {
    return onTimeoutValue;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function toAssetList(value) {
  if (Array.isArray(value)) {
    return value.filter((u) => typeof u === "string");
  }
  if (typeof value !== "string" || value.trim() === "") {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((u) => typeof u === "string")
      : [];
  } catch {
    return [];
  }
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
  PROVIDER_POLL_QA_RETRY_EXTRA_MS,
  translateLimitReason,
  checkGenerationLimits,
  getBillableCreditCost,
  applyCreditDelta,
  deductGenerationCredits,
  chargeGenerationCreditsIfNotYetCharged,
  generationCreditsAlreadyCharged,
  getGenerationChargeTotal,
  generationRefundTotal,
  refundGenerationCreditsIfCharged,
  ensureGenerationCreditsRefunded,
  reconcileFailMessageWithRefund,
  recordGeneration,
  extractImageUrls,
  toAssetList,
  toClientStatus,
  toDbStatus,
  normalizeProviderStatus,
  isProviderSuccessStatus,
  isProviderFailStatus,
  withTimeout,
};
